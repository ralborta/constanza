import { PrismaClient } from '@prisma/client';
import { updateInvoiceSummary, updateCustomerSummary } from './summarization.js';

const prisma = new PrismaClient();

interface JobResult {
  success: boolean;
  processed: number;
  errors: number;
  details: string[];
}

/**
 * Job: Detectar conversaciones estancadas (sin respuesta en X días)
 */
export async function detectStaleConversations(
  tenantId?: string,
  daysWithoutResponse = 3
): Promise<JobResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysWithoutResponse);

  const where: any = {
    direction: 'OUTBOUND',
    status: {
      in: ['SENT', 'DELIVERED'],
    },
    ts: {
      lte: cutoffDate,
    },
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  // Buscar eventos outbound sin respuesta
  const outboundEvents = await prisma.contactEvent.findMany({
    where,
    include: {
      invoice: true,
      customer: true,
    },
  });

  const results: JobResult = {
    success: true,
    processed: 0,
    errors: 0,
    details: [],
  };

  for (const event of outboundEvents) {
    try {
      // Verificar si hay respuesta posterior
      const hasResponse = await prisma.contactEvent.findFirst({
        where: {
          tenantId: event.tenantId,
          customerId: event.customerId,
          invoiceId: event.invoiceId,
          direction: 'INBOUND',
          ts: {
            gt: event.ts,
          },
        },
      });

      if (!hasResponse) {
        // Marcar como estancada (guardar en payload)
        const currentPayload = (event.payload as any) || {};
        await prisma.contactEvent.update({
          where: { id: event.id },
          data: {
            payload: {
              ...currentPayload,
              staleConversation: true,
              staleSince: cutoffDate.toISOString(),
            },
          },
        });

        results.processed++;
        results.details.push(
          `Conversación estancada: ${event.channel} para cliente ${event.customerId}`
        );
      }
    } catch (error: any) {
      results.errors++;
      results.details.push(`Error procesando evento ${event.id}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Job: Recalcular resúmenes de facturas con nuevas interacciones
 */
export async function recalculateInvoiceSummaries(
  tenantId?: string,
  limit = 50
): Promise<JobResult> {
  const where: any = {
    invoiceId: {
      not: null,
    },
  };

  if (tenantId) {
    where.tenantId = tenantId;
  }

  // Buscar facturas con eventos recientes (últimas 24 horas)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentEvents = await prisma.contactEvent.findMany({
    where: {
      ...where,
      ts: {
        gte: oneDayAgo,
      },
    },
    select: {
      invoiceId: true,
      tenantId: true,
    },
    distinct: ['invoiceId'],
    take: limit,
  });

  const results: JobResult = {
    success: true,
    processed: 0,
    errors: 0,
    details: [],
  };

  for (const event of recentEvents) {
    if (!event.invoiceId || !event.tenantId) continue;

    try {
      await updateInvoiceSummary(event.invoiceId, event.tenantId);
      results.processed++;
      results.details.push(`Resumen actualizado para factura ${event.invoiceId}`);
    } catch (error: any) {
      results.errors++;
      results.details.push(
        `Error actualizando resumen de factura ${event.invoiceId}: ${error.message}`
      );
    }
  }

  return results;
}

/**
 * Job: Recalcular resúmenes de clientes con nuevas interacciones
 */
export async function recalculateCustomerSummaries(
  tenantId?: string,
  limit = 50
): Promise<JobResult> {
  const where: any = {};

  if (tenantId) {
    where.tenantId = tenantId;
  }

  // Buscar clientes con eventos recientes (últimas 24 horas)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const recentEvents = await prisma.contactEvent.findMany({
    where: {
      ...where,
      ts: {
        gte: oneDayAgo,
      },
    },
    select: {
      customerId: true,
      tenantId: true,
    },
    distinct: ['customerId'],
    take: limit,
  });

  const results: JobResult = {
    success: true,
    processed: 0,
    errors: 0,
    details: [],
  };

  for (const event of recentEvents) {
    if (!event.customerId || !event.tenantId) continue;

    try {
      await updateCustomerSummary(event.customerId, event.tenantId);
      results.processed++;
      results.details.push(`Resumen actualizado para cliente ${event.customerId}`);
    } catch (error: any) {
      results.errors++;
      results.details.push(
        `Error actualizando resumen de cliente ${event.customerId}: ${error.message}`
      );
    }
  }

  return results;
}

/**
 * Job: Ejecutar todos los jobs de mantenimiento
 */
export async function runAllMaintenanceJobs(tenantId?: string): Promise<{
  staleConversations: JobResult;
  invoiceSummaries: JobResult;
  customerSummaries: JobResult;
}> {
  const [staleConversations, invoiceSummaries, customerSummaries] = await Promise.all([
    detectStaleConversations(tenantId),
    recalculateInvoiceSummaries(tenantId),
    recalculateCustomerSummaries(tenantId),
  ]);

  return {
    staleConversations,
    invoiceSummaries,
    customerSummaries,
  };
}
