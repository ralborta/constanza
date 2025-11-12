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
}

