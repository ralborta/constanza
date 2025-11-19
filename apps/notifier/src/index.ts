import Fastify, { FastifyInstance } from 'fastify';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { sendEmail, EmailError, EmailErrorCode } from './channels/email.js';
import { sendWhatsApp } from './channels/whatsapp.js';
import { sendVoice } from './channels/voice.js';
import { renderEmailTemplate } from './templates/email.js';
import { webhookRoutes } from './routes/webhooks.js';
import { WhatsAppPoller } from './polling/whatsapp-poller.js';
// SimpleLogger está disponible globalmente desde types.d.ts (incluido en tsconfig.json)

const prisma = new PrismaClient();

const server: FastifyInstance = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

const logger = server.log as unknown as SimpleLogger;

// Redis connection
// BullMQ requiere maxRetriesPerRequest: null
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// BullMQ Queue
export const notifyQueue = new Queue('notify.send', {
  connection: redis,
});

// BullMQ Worker - procesa mensajes uno por uno con rate limiting
export const notifyWorker = new Worker(
  'notify.send',
  async (job) => {
    const { channel, customerId, invoiceId, message, templateId, variables, batchId, tenantId } = job.data;

    logger.info({ jobId: job.id, channel, customerId }, 'Processing notification');

    try {
      // Obtener cliente
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        throw new Error(`Customer ${customerId} not found`);
      }

      let result;
      let externalMessageId: string | undefined;
      let status = 'SENT';

      // Enviar según canal
      if (channel === 'EMAIL') {
        // Renderizar template con variables resueltas
        const rendered = await renderEmailTemplate({
          templateText: message.body || message.text || '',
          subject: message.subject, // Pasar el subject para que también pueda usar variables
          variables: variables || {},
          customerId: customer.id,
          invoiceId: invoiceId || undefined,
          tenantId: tenantId || customer.tenantId,
        });

        // Enviar email con HTML renderizado (el subject ya tiene las variables reemplazadas)
        result = await sendEmail({
          to: customer.email!,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
        externalMessageId = result.messageId;
      } else if (channel === 'WHATSAPP') {
        result = await sendWhatsApp({
          to: customer.telefono || '',
          message: message.text || message.body,
          templateId,
          variables,
        });
        externalMessageId = result.messageId;
      } else if (channel === 'VOICE') {
        result = await sendVoice({
          to: customer.telefono || '',
          script: message.text || message.body,
          agentId: process.env.ELEVENLABS_AGENT_ID,
          variables,
        });
        externalMessageId = result.callId;
      } else {
        throw new Error(`Unknown channel: ${channel}`);
      }

      // Registrar en contact.events
      await prisma.contactEvent.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          invoiceId: invoiceId || null,
          batchId: batchId || null,
          channel,
          direction: 'OUTBOUND',
          isManual: false,
          templateId: templateId || null,
          messageText: message.text || message.body,
          status,
          externalMessageId,
          ts: new Date(),
        },
      });

      logger.info({ jobId: job.id, channel, customerId }, 'Notification sent successfully');

      // Actualizar batch job si existe
      if (batchId && tenantId) {
        try {
          await prisma.batchJob.update({
            where: { id: batchId },
            data: {
              processed: { increment: 1 },
            },
          });
        } catch (error: any) {
          logger.warn({ batchId, error: error.message }, 'Failed to update batch job');
        }
      }

      return { success: true, externalMessageId };
    } catch (error: any) {
      // Determinar código de error y mensaje
      let errorCode = 'ERROR_UNKNOWN';
      let errorMessage = error.message || 'Error desconocido';

      if (error instanceof EmailError) {
        errorCode = error.code;
        errorMessage = error.message;
        logger.error(
          {
            jobId: job.id,
            errorCode: error.code,
            error: error.message,
            originalError: error.originalError?.message,
            channel,
            customerId,
            stack: error.stack,
          },
          `❌ Failed to send ${channel} notification: ${error.code} - ${error.message}`
        );
      } else {
        logger.error(
          { 
            jobId: job.id, 
            error: error.message, 
            stack: error.stack,
            channel,
            customerId,
          }, 
          `❌ Failed to send ${channel} notification: ${error.message}`
        );
      }

      // Registrar error en contact.events
      await prisma.contactEvent.create({
        data: {
          tenantId: tenantId || job.data.tenantId,
          customerId,
          invoiceId: invoiceId || null,
          batchId: batchId || null,
          channel,
          direction: 'OUTBOUND',
          isManual: false,
          templateId: templateId || null,
          messageText: message.text || message.body,
          status: 'FAILED',
          errorReason: error.message,
          ts: new Date(),
        },
      });

      // Actualizar batch job con error si existe
      if (batchId && tenantId) {
        try {
          // Obtener el batchJob actual para ver si ya tiene errorSummary
          const currentBatch = await prisma.batchJob.findUnique({
            where: { id: batchId },
          });

          const errorInfo = {
            code: errorCode,
            message: errorMessage,
            channel,
            customerId,
            timestamp: new Date().toISOString(),
          };

          // Actualizar errorSummary: agregar el nuevo error a la lista
          const existingErrors = currentBatch?.errorSummary 
            ? (typeof currentBatch.errorSummary === 'object' && Array.isArray(currentBatch.errorSummary)
                ? currentBatch.errorSummary 
                : [currentBatch.errorSummary])
            : [];

          await prisma.batchJob.update({
            where: { id: batchId },
            data: {
              failed: { increment: 1 },
              errorSummary: [...existingErrors, errorInfo],
            },
          });
        } catch (err: any) {
          logger.warn({ batchId, error: err.message }, 'Failed to update batch job on error');
        }
      }

      throw error;
    }
  },
  {
    connection: redis,
    limiter: {
      max: 10, // Máximo 10 mensajes/llamadas
      duration: 60000, // por minuto (rate limiting)
    },
    concurrency: 1, // Procesar uno por uno
  }
);

// Health check
server.get('/health', async () => {
  return {
    status: 'ok',
    service: 'notifier',
    queue: {
      waiting: await notifyQueue.getWaitingCount(),
      active: await notifyQueue.getActiveCount(),
      completed: await notifyQueue.getCompletedCount(),
      failed: await notifyQueue.getFailedCount(),
    },
  };
});

// Endpoint para agregar mensaje a la cola
server.post('/notify/send', async (request, reply) => {
  const { channel, customerId, invoiceId, message, templateId, variables, batchId, tenantId } =
    request.body as any;

  const job = await notifyQueue.add('send', {
    channel,
    customerId,
    invoiceId,
    message,
    templateId,
    variables,
    batchId,
    tenantId: tenantId || (request as any).user?.tenant_id,
  });

  return {
    jobId: job.id,
    status: 'queued',
  };
});

const start = async () => {
  try {
    // Registrar webhooks (builderbot puede enviar webhooks)
    await server.register(webhookRoutes, { prefix: '/wh' });

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    logger.info(`🚀 Notifier running on http://${host}:${port}`);
    logger.info('📬 Worker started, processing notifications...');
    logger.info('🔗 Webhook endpoint: POST /wh/wa/incoming');

    // Iniciar polling de mensajes de WhatsApp como respaldo (si está habilitado)
    // Builderbot puede usar webhooks, pero el polling sirve como backup
    if (process.env.ENABLE_WHATSAPP_POLLING === 'true') {
      const pollInterval = Number(process.env.WHATSAPP_POLL_INTERVAL_MS) || 30000;
      const poller = new WhatsAppPoller(pollInterval);
      await poller.start();
      logger.info(`📱 WhatsApp polling enabled (interval: ${pollInterval}ms) - Backup method`);
    } else {
      logger.info('📱 WhatsApp polling disabled (using webhooks only)');
    }
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

