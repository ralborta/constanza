import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import {
  generateInvoiceSummary,
  generateCustomerSummary,
  updateInvoiceSummary,
  updateCustomerSummary,
} from '../services/summarization.js';

const prisma = new PrismaClient();

export async function summaryRoutes(fastify: FastifyInstance) {
  // GET /v1/invoices/:id/summary - Obtener resumen de una factura
  fastify.get(
    '/invoices/:id/summary',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user.tenant_id;

      // Verificar que la factura existe y pertenece al tenant
      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!invoice) {
        return reply.status(404).send({ error: 'Factura no encontrada' });
      }

      // Verificar que hay eventos antes de generar resumen
      const eventCount = await prisma.contactEvent.count({
        where: {
          invoiceId: id,
          tenantId,
        },
      });

      fastify.log.info(
        { invoiceId: id, tenantId, eventCount },
        'Generando resumen de factura'
      );

      if (eventCount === 0) {
        return reply.status(200).send({
          invoiceId: id,
          summary: {
            summary: 'No hay interacciones registradas para esta factura.',
            keyPoints: [],
          },
          generatedAt: new Date().toISOString(),
        });
      }

      // Generar resumen
      const summary = await generateInvoiceSummary(id, tenantId);

      fastify.log.info(
        { invoiceId: id, summaryLength: summary.summary.length },
        'Resumen generado exitosamente'
      );

      return reply.status(200).send({
        invoiceId: id,
        summary,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error(
        { 
          error: error.message, 
          stack: error.stack,
          invoiceId: id,
          tenantId 
        }, 
        'Error generando resumen de factura'
      );
      return reply.status(500).send({
        error: 'Error generando resumen',
        message: error.message,
      });
    }
  });

  // POST /v1/invoices/:id/summary/update - Actualizar resumen de una factura
  fastify.post(
    '/invoices/:id/summary/update',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user.tenant_id;

      // Verificar que la factura existe
      const invoice = await prisma.invoice.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!invoice) {
        return reply.status(404).send({ error: 'Factura no encontrada' });
      }

      // Actualizar resumen
      await updateInvoiceSummary(id, tenantId);

      return reply.status(200).send({
        invoiceId: id,
        status: 'updated',
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error actualizando resumen de factura');
      return reply.status(500).send({
        error: 'Error actualizando resumen',
        message: error.message,
      });
    }
  });

  // GET /v1/customers/:id/summary - Obtener resumen de un cliente
  fastify.get(
    '/customers/:id/summary',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user.tenant_id;

      // Verificar que el cliente existe
      const customer = await prisma.customer.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!customer) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }

      // Generar resumen
      const summary = await generateCustomerSummary(id, tenantId);

      return reply.status(200).send({
        customerId: id,
        summary,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error generando resumen de cliente');
      return reply.status(500).send({
        error: 'Error generando resumen',
        message: error.message,
      });
    }
  });

  // POST /v1/customers/:id/summary/update - Actualizar resumen de un cliente
  fastify.post(
    '/customers/:id/summary/update',
    { preHandler: [authenticate] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const tenantId = request.user.tenant_id;

      // Verificar que el cliente existe
      const customer = await prisma.customer.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!customer) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }

      // Actualizar resumen
      await updateCustomerSummary(id, tenantId);

      return reply.status(200).send({
        customerId: id,
        status: 'updated',
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error actualizando resumen de cliente');
      return reply.status(500).send({
        error: 'Error actualizando resumen',
        message: error.message,
      });
    }
  });
}
