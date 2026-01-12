import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

export async function kpiRoutes(fastify: FastifyInstance) {
  // GET /kpi/summary - Resumen de KPIs
  fastify.get(
    '/kpi/summary',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const tenantId = user.tenant_id as string;

      // DSO (Days Sales Outstanding) - promedio de días de cobranza
      const invoices = await prisma.invoice.findMany({
        where: {
          tenantId,
          estado: { in: ['ABIERTA', 'PARCIAL'] },
        },
      });

      const today = new Date();
      let totalDays = 0;
      let count = 0;

      invoices.forEach((inv: { fechaVto: Date }) => {
        const daysDiff = Math.floor((today.getTime() - inv.fechaVto.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += daysDiff;
        count++;
      });

      const dso = count > 0 ? totalDays / count : 0;

      // Cash-in últimos 7 y 30 días
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const payments7d = await prisma.paymentApplication.findMany({
        where: {
          tenantId,
          appliedAt: {
            gte: sevenDaysAgo,
          },
        },
      });

      const payments30d = await prisma.paymentApplication.findMany({
        where: {
          tenantId,
          appliedAt: {
            gte: thirtyDaysAgo,
          },
        },
      });

      const cashIn7d = payments7d.reduce((sum: number, app: { amount: number }) => sum + app.amount, 0);
      const cashIn30d = payments30d.reduce((sum: number, app: { amount: number }) => sum + app.amount, 0);

      // Promesas de hoy
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const promisesToday = await prisma.promise.count({
        where: {
          tenantId,
          dueDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: 'PENDIENTE',
        },
      });

      // Promesas vencidas
      const promisesBroken = await prisma.promise.count({
        where: {
          tenantId,
          status: 'INCUMPLIDA',
        },
      });

      // % auto-imputado (aplicaciones authoritative)
      const totalApplications = await prisma.paymentApplication.count({
        where: {
          tenantId,
        },
      });

      const authoritativeApplications = await prisma.paymentApplication.count({
        where: {
          tenantId,
          isAuthoritative: true,
        },
      });

      const autoAppliedPct = totalApplications > 0 ? authoritativeApplications / totalApplications : 0;

      // E-cheques pendientes
      const echeqsPending = await prisma.echeq.count({
        where: {
          tenantId,
          statusOperativo: 'RECIBIDO',
        },
      });

      return {
        dso: Math.round(dso * 100) / 100,
        cashIn7d: cashIn7d / 100, // Convertir centavos a pesos
        cashIn30d: cashIn30d / 100,
        promisesToday,
        promisesBroken,
        autoAppliedPct: Math.round(autoAppliedPct * 10000) / 100, // Porcentaje con 2 decimales
        echeqsPending,
        channelHealth: {
          whatsapp: {
            deliveryRate: 0.95, // TODO: Calcular desde contact.events
            readRate: 0.8,
          },
          email: {
            deliveryRate: 0.98,
            openRate: 0.45,
          },
        },
      };
    }
  );

  // GET /v1/kpi/interaction-metrics - Métricas operativas de interacciones
  fastify.get(
    '/kpi/interaction-metrics',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const tenantId = user.tenant_id as string;

      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Total de interacciones por canal (últimos 30 días)
      const events30d = await prisma.contactEvent.findMany({
        where: {
          tenantId,
          ts: {
            gte: thirtyDaysAgo,
          },
        },
      });

      // Interacciones outbound por canal
      const outboundByChannel = events30d
        .filter((e) => e.direction === 'OUTBOUND')
        .reduce((acc, e) => {
          acc[e.channel] = (acc[e.channel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Interacciones inbound por canal
      const inboundByChannel = events30d
        .filter((e) => e.direction === 'INBOUND')
        .reduce((acc, e) => {
          acc[e.channel] = (acc[e.channel] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

      // Tasa de respuesta por canal
      const responseRateByChannel: Record<string, { sent: number; responded: number; rate: number }> = {};

      for (const channel of ['WHATSAPP', 'EMAIL', 'VOICE']) {
        const outbound = events30d.filter(
          (e) => e.channel === channel && e.direction === 'OUTBOUND'
        );
        const sent = outbound.length;

        // Para cada outbound, verificar si hay inbound posterior del mismo cliente/factura
        let responded = 0;
        for (const outEvent of outbound) {
          const hasResponse = events30d.some(
            (e) =>
              e.channel === channel &&
              e.direction === 'INBOUND' &&
              e.customerId === outEvent.customerId &&
              (outEvent.invoiceId ? e.invoiceId === outEvent.invoiceId : true) &&
              e.ts > outEvent.ts
          );
          if (hasResponse) {
            responded++;
          }
        }

        responseRateByChannel[channel] = {
          sent,
          responded,
          rate: sent > 0 ? Math.round((responded / sent) * 10000) / 100 : 0,
        };
      }

      // Conversaciones estancadas (sin respuesta en 3+ días)
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const staleOutbound = events30d.filter(
        (e) =>
          e.direction === 'OUTBOUND' &&
          e.status === 'SENT' &&
          e.ts <= threeDaysAgo &&
          !events30d.some(
            (resp) =>
              resp.direction === 'INBOUND' &&
              resp.customerId === e.customerId &&
              (e.invoiceId ? resp.invoiceId === e.invoiceId : true) &&
              resp.ts > e.ts
          )
      );

      // Volumen de casos en seguimiento (facturas con interacciones recientes)
      const invoicesWithRecentEvents = await prisma.contactEvent.findMany({
        where: {
          tenantId,
          invoiceId: {
            not: null,
          },
          ts: {
            gte: sevenDaysAgo,
          },
        },
        select: {
          invoiceId: true,
        },
        distinct: ['invoiceId'],
      });

      // Efectividad por canal (delivered/sent)
      const effectivenessByChannel: Record<string, { sent: number; delivered: number; rate: number }> = {};

      for (const channel of ['WHATSAPP', 'EMAIL', 'VOICE']) {
        const channelEvents = events30d.filter((e) => e.channel === channel && e.direction === 'OUTBOUND');
        const sent = channelEvents.length;
        const delivered = channelEvents.filter((e) => e.status === 'SENT' || e.status === 'DELIVERED').length;

        effectivenessByChannel[channel] = {
          sent,
          delivered,
          rate: sent > 0 ? Math.round((delivered / sent) * 10000) / 100 : 0,
        };
      }

      // Tiempo promedio de respuesta (solo para inbound que responden a outbound)
      let totalResponseTime = 0;
      let responseCount = 0;

      for (const inbound of events30d.filter((e) => e.direction === 'INBOUND')) {
        // Buscar el outbound más reciente anterior a este inbound
        const relatedOutbound = events30d
          .filter(
            (e) =>
              e.direction === 'OUTBOUND' &&
              e.channel === inbound.channel &&
              e.customerId === inbound.customerId &&
              (inbound.invoiceId ? e.invoiceId === inbound.invoiceId : true) &&
              e.ts < inbound.ts
          )
          .sort((a, b) => b.ts.getTime() - a.ts.getTime())[0];

        if (relatedOutbound) {
          const responseTime = inbound.ts.getTime() - relatedOutbound.ts.getTime();
          totalResponseTime += responseTime;
          responseCount++;
        }
      }

      const avgResponseTimeHours = responseCount > 0 ? totalResponseTime / responseCount / (1000 * 60 * 60) : 0;

      return {
        period: {
          start: thirtyDaysAgo.toISOString(),
          end: today.toISOString(),
        },
        volume: {
          outbound: outboundByChannel,
          inbound: inboundByChannel,
          total: events30d.length,
        },
        responseRate: responseRateByChannel,
        effectiveness: effectivenessByChannel,
        staleConversations: staleOutbound.length,
        casesInFollowUp: invoicesWithRecentEvents.length,
        avgResponseTimeHours: Math.round(avgResponseTimeHours * 100) / 100,
      };
    }
  );
}

