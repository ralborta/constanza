import Fastify, { FastifyInstance } from 'fastify';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from './channels/email.js';
import { sendWhatsApp } from './channels/whatsapp.js';
import { sendVoice } from './channels/voice.js';
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
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// BullMQ Queue
export const notifyQueue = new Queue('notify.send', {
  connection: redis,
});

// BullMQ Worker - procesa mensajes uno por uno con rate limiting
export const notifyWorker = new Worker(
  'notify.send',
  async (job) => {
    const { channel, customerId, invoiceId, message, templateId, variables, batchId } = job.data;

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
        result = await sendEmail({
          to: customer.email,
          subject: message.subject || 'Recordatorio de pago',
          body: message.body || message.text,
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

      return { success: true, externalMessageId };
    } catch (error: any) {
      logger.error({ jobId: job.id, error: error.message }, 'Failed to send notification');

      // Registrar error en contact.events
      await prisma.contactEvent.create({
        data: {
          tenantId: job.data.tenantId,
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
  const { channel, customerId, invoiceId, message, templateId, variables, batchId } =
    request.body as any;

  const job = await notifyQueue.add('send', {
    channel,
    customerId,
    invoiceId,
    message,
    templateId,
    variables,
    batchId,
    tenantId: (request as any).user?.tenant_id,
  });

  return {
    jobId: job.id,
    status: 'queued',
  };
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    logger.info(`🚀 Notifier running on http://${host}:${port}`);
    logger.info('📬 Worker started, processing notifications...');
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

