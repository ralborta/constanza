import { FastifyInstance } from 'fastify';
import {
  detectStaleConversations,
  recalculateInvoiceSummaries,
  recalculateCustomerSummaries,
  runAllMaintenanceJobs,
} from '../services/jobs.js';

export async function jobRoutes(fastify: FastifyInstance) {
  // POST /v1/jobs/stale-conversations - Detectar conversaciones estancadas
  fastify.post('/stale-conversations', async (request, reply) => {
    try {
      const { daysWithoutResponse } = (request.body as any) || {};
      const tenantId = (request as any).tenantId; // Opcional, puede venir del JWT

      const result = await detectStaleConversations(
        tenantId,
        daysWithoutResponse || 3
      );

      return reply.status(200).send({
        job: 'stale-conversations',
        result,
        executedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error ejecutando job de conversaciones estancadas');
      return reply.status(500).send({
        error: 'Error ejecutando job',
        message: error.message,
      });
    }
  });

  // POST /v1/jobs/recalculate-invoice-summaries - Recalcular resúmenes de facturas
  fastify.post('/recalculate-invoice-summaries', async (request, reply) => {
    try {
      const { limit } = (request.body as any) || {};
      const tenantId = (request as any).tenantId;

      const result = await recalculateInvoiceSummaries(tenantId, limit || 50);

      return reply.status(200).send({
        job: 'recalculate-invoice-summaries',
        result,
        executedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error ejecutando job de resúmenes de facturas');
      return reply.status(500).send({
        error: 'Error ejecutando job',
        message: error.message,
      });
    }
  });

  // POST /v1/jobs/recalculate-customer-summaries - Recalcular resúmenes de clientes
  fastify.post('/recalculate-customer-summaries', async (request, reply) => {
    try {
      const { limit } = (request.body as any) || {};
      const tenantId = (request as any).tenantId;

      const result = await recalculateCustomerSummaries(tenantId, limit || 50);

      return reply.status(200).send({
        job: 'recalculate-customer-summaries',
        result,
        executedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error ejecutando job de resúmenes de clientes');
      return reply.status(500).send({
        error: 'Error ejecutando job',
        message: error.message,
      });
    }
  });

  // POST /v1/jobs/run-all - Ejecutar todos los jobs de mantenimiento
  fastify.post('/run-all', async (request, reply) => {
    try {
      const tenantId = (request as any).tenantId;

      const results = await runAllMaintenanceJobs(tenantId);

      return reply.status(200).send({
        job: 'run-all-maintenance',
        results,
        executedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error ejecutando jobs de mantenimiento');
      return reply.status(500).send({
        error: 'Error ejecutando jobs',
        message: error.message,
      });
    }
  });
}
