import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma.js';
import { sendEmail, EmailError } from './channels/email.js';
import { sendWhatsApp } from './channels/whatsapp.js';
import { sendVoice } from './channels/voice.js';
import type { FastifyBaseLogger } from 'fastify';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const notifyQueue = new Queue('notify.send', {
  connection: redis,
});

export async function getNotifyQueueStats() {
  return {
    waiting: await notifyQueue.getWaitingCount(),
    active: await notifyQueue.getActiveCount(),
    completed: await notifyQueue.getCompletedCount(),
    failed: await notifyQueue.getFailedCount(),
  };
}

export function startNotifyWorker(logger: FastifyBaseLogger) {
  const worker = new Worker(
    'notify.send',
    async (job) => {
      const { channel, customerId, invoiceId, message, templateId, variables, batchId, tenantId } =
        job.data;

      logger.info({ jobId: job.id, channel, customerId }, '[notify] Processing notification');

      try {
        // Obtener cliente
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
        });
        if (!customer) throw new Error(`Customer ${customerId} not found`);

        let externalMessageId: string | undefined;
        let whatsappDest: string | undefined;
        let status = 'SENT';

        if (channel === 'EMAIL') {
          const subject = message.subject || 'Notificación';
          const body = message.body || message.text || '';
          const result = await sendEmail({
            to: customer.email!,
            subject,
            html: body,
            text: body,
          });
          externalMessageId = result.messageId;
        } else if (channel === 'WHATSAPP') {
          const body = message.text || message.body || '';
          const result = await sendWhatsApp({
            to: customer.telefono || '',
            message: body,
            templateId,
            variables,
          });
          externalMessageId = result.messageId;
          // Log destino normalizado para auditoría
          // capturar destino normalizado
          whatsappDest = (result as any)?.to;
          if (whatsappDest) logger.info({ jobId: job.id, to: whatsappDest }, '[notify][whatsapp] destination');
        } else if (channel === 'VOICE') {
          const body = message.text || message.body || '';
          const result = await sendVoice({
            to: customer.telefono || '',
            script: body,
            agentId: process.env.ELEVENLABS_AGENT_ID,
            variables,
          });
          externalMessageId = result.callId;
        } else {
          throw new Error(`Unknown channel: ${channel}`);
        }

        // Registrar evento
        await prisma.contactEvent.create({
          data: {
            tenantId: tenantId || customer.tenantId,
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
            // Guardar el destino en payload para trazabilidad
            payload: channel === 'WHATSAPP' && whatsappDest ? ({ to: whatsappDest } as any) : undefined,
            ts: new Date(),
          },
        });

        // Actualizar batch contadores y cierre
        if (batchId && tenantId) {
          try {
            await prisma.batchJob.update({
              where: { id: batchId },
              data: {
                processed: { increment: 1 },
                startedAt: { set: new Date() },
              },
            });
            const updated = await prisma.batchJob.findUnique({ where: { id: batchId } });
            if (updated) {
              const done = (updated.processed || 0) + (updated.failed || 0);
              if (done >= updated.totalMessages && updated.status !== 'COMPLETED') {
                await prisma.batchJob.update({
                  where: { id: batchId },
                  data: { status: 'COMPLETED', completedAt: new Date() },
                });
                logger.info({ batchId }, '[notify] Batch completed');
              }
            }
          } catch (e: any) {
            logger.warn({ batchId, error: e.message }, '[notify] Failed to update batch job');
          }
        }

        logger.info({ jobId: job.id, channel, customerId }, '[notify] Notification sent');
        return { success: true, externalMessageId };
      } catch (error: any) {
        let errorCode = 'ERROR_UNKNOWN';
        let errorMessage = error.message || 'Error desconocido';
        if (error instanceof EmailError) {
          errorCode = error.code;
          errorMessage = error.message;
          logger.error(
            { jobId: job.id, errorCode, error: error.message, channel, customerId, stack: error.stack },
            `❌ Failed to send ${channel} notification: ${error.code} - ${error.message}`
          );
        } else {
          logger.error(
            { jobId: job.id, error: error.message, stack: error.stack, channel, customerId },
            `❌ Failed to send ${channel} notification: ${error.message}`
          );
        }

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
            errorReason: errorMessage,
            ts: new Date(),
          },
        });

        if (batchId && tenantId) {
          try {
            const current = await prisma.batchJob.findUnique({ where: { id: batchId } });
            const errorInfo = {
              code: errorCode,
              message: errorMessage,
              channel,
              customerId,
              timestamp: new Date().toISOString(),
            };
            const existing = current?.errorSummary
              ? (Array.isArray(current.errorSummary) ? current.errorSummary : [current.errorSummary])
              : [];
            await prisma.batchJob.update({
              where: { id: batchId },
              data: {
                failed: { increment: 1 },
                errorSummary: [...existing, errorInfo],
                startedAt: current?.startedAt ? undefined : new Date(),
              },
            });
            const updated = await prisma.batchJob.findUnique({ where: { id: batchId } });
            if (updated) {
              const done = (updated.processed || 0) + (updated.failed || 0);
              if (done >= updated.totalMessages && updated.status !== 'COMPLETED') {
                await prisma.batchJob.update({
                  where: { id: batchId },
                  data: { status: 'COMPLETED', completedAt: new Date() },
                });
                logger.info({ batchId }, '[notify] Batch completed (with failures)');
              }
            }
          } catch (e: any) {
            logger.warn({ batchId, error: e.message }, '[notify] Failed to update batch job on error');
          }
        }
        throw error;
      }
    },
    {
      connection: redis,
      limiter: { max: 10, duration: 60000 },
      concurrency: 1,
    }
  );

  worker.on('error', (err) => {
    logger.error({ err }, '[notify] Worker error');
  });

  logger.info('[notify] Worker started');
  return worker;
}


