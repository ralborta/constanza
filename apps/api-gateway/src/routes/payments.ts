import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  // GET /payments/transfers - Listar transferencias bancarias
  fastify.get(
    '/payments/transfers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { status, sourceSystem, dateFrom, dateTo, limit = '50', offset = '0' } = request.query as {
        status?: string;
        sourceSystem?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: string;
        offset?: string;
      };

      const where: any = {
        tenantId: user.tenant_id,
        method: 'TRANSFERENCIA',
      };

      if (status) {
        where.status = status;
      }

      if (sourceSystem) {
        where.sourceSystem = sourceSystem;
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) {
          where.createdAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          where.createdAt.lte = new Date(dateTo);
        }
      }

      const payments = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          applications: {
            include: {
              invoice: {
                include: {
                  customer: {
                    select: {
                      razonSocial: true,
                      codigoUnico: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      const total = await prisma.payment.count({ where });

      // Calcular totales
      const totalAmount = payments.reduce((sum, payment) => {
        return (
          sum +
          payment.applications.reduce((appSum, app) => appSum + app.amount, 0)
        );
      }, 0);

      return {
        transfers: payments.map((payment) => ({
          id: payment.id,
          sourceSystem: payment.sourceSystem,
          status: payment.status,
          externalRef: payment.externalRef,
          createdAt: payment.createdAt,
          settledAt: payment.settledAt,
          totalAmount: payment.applications.reduce((sum, app) => sum + app.amount, 0),
          applications: payment.applications.map((app) => ({
            id: app.id,
            invoice: {
              id: app.invoice.id,
              numero: app.invoice.numero,
              customer: {
                razonSocial: app.invoice.customer.razonSocial,
                codigoUnico: app.invoice.customer.codigoUnico,
              },
            },
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
            appliedAt: app.appliedAt,
          })),
        })),
        total,
        totalAmount,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    }
  );

  // GET /payments/reconciliation - Datos para conciliación
  fastify.get(
    '/payments/reconciliation',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { dateFrom, dateTo } = request.query as {
        dateFrom?: string;
        dateTo?: string;
      };

      const dateFilter: any = {};
      if (dateFrom) {
        dateFilter.gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.lte = new Date(dateTo);
      }

      // Pagos aplicados pero no liquidados
      const pendingLiquidation = await prisma.payment.findMany({
        where: {
          tenantId: user.tenant_id,
          status: 'PEND_LIQ',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          applications: {
            include: {
              invoice: {
                include: {
                  customer: {
                    select: {
                      razonSocial: true,
                      codigoUnico: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Pagos autoritativos (Cucuru) vs manuales
      const authoritativePayments = await prisma.payment.findMany({
        where: {
          tenantId: user.tenant_id,
          sourceSystem: 'CUCURU',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          applications: {
            where: {
              isAuthoritative: true,
            },
          },
        },
      });

      const manualPayments = await prisma.payment.findMany({
        where: {
          tenantId: user.tenant_id,
          sourceSystem: 'MANUAL',
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        include: {
          applications: true,
        },
      });

      // Resumen por estado
      const statusSummary = await prisma.payment.groupBy({
        by: ['status'],
        where: {
          tenantId: user.tenant_id,
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        _count: {
          id: true,
        },
      });

      // Calcular totales
      const calculateTotal = (payments: any[]) => {
        return payments.reduce((sum, payment) => {
          return (
            sum +
            payment.applications.reduce((appSum: number, app: any) => appSum + app.amount, 0)
          );
        }, 0);
      };

      return {
        pendingLiquidation: pendingLiquidation.map((payment) => ({
          id: payment.id,
          sourceSystem: payment.sourceSystem,
          method: payment.method,
          status: payment.status,
          externalRef: payment.externalRef,
          createdAt: payment.createdAt,
          totalAmount: payment.applications.reduce((sum, app) => sum + app.amount, 0),
          applications: payment.applications.map((app) => ({
            invoice: {
              numero: app.invoice.numero,
              customer: app.invoice.customer.razonSocial,
            },
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
          })),
        })),
        summary: {
          pendingLiquidation: {
            count: pendingLiquidation.length,
            totalAmount: calculateTotal(pendingLiquidation),
          },
          authoritative: {
            count: authoritativePayments.length,
            totalAmount: calculateTotal(authoritativePayments),
          },
          manual: {
            count: manualPayments.length,
            totalAmount: calculateTotal(manualPayments),
          },
          statusBreakdown: statusSummary.map((s) => ({
            status: s.status,
            count: s._count.id,
          })),
        },
      };
    }
  );

  // POST /payments/reconcile - Reconciliar un pago
  fastify.post(
    '/payments/reconcile',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = z
        .object({
          paymentId: z.string().uuid(),
          action: z.enum(['LIQUIDATE', 'REJECT']),
          notes: z.string().optional(),
        })
        .parse(request.body);

      const payment = await prisma.payment.findFirst({
        where: {
          id: body.paymentId,
          tenantId: user.tenant_id,
        },
      });

      if (!payment) {
        return reply.status(404).send({ error: 'Pago no encontrado' });
      }

      if (payment.status !== 'PEND_LIQ') {
        return reply.status(400).send({
          error: `El pago no está en estado PEND_LIQ. Estado actual: ${payment.status}`,
        });
      }

      const newStatus = body.action === 'LIQUIDATE' ? 'LIQUIDADO' : 'RECHAZADO';
      const settledAt = body.action === 'LIQUIDATE' ? new Date() : null;

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          settledAt,
        },
      });

      fastify.log.info(
        { paymentId: payment.id, action: body.action, userId: user.user_id },
        'Payment reconciled'
      );

      return {
        paymentId: payment.id,
        status: newStatus,
        settledAt,
      };
    }
  );

  // GET /payments/:id - Detalle de un pago
  fastify.get(
    '/payments/:id',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const payment = await prisma.payment.findFirst({
        where: {
          id,
          tenantId: user.tenant_id,
        },
        include: {
          applications: {
            include: {
              invoice: {
                include: {
                  customer: {
                    select: {
                      razonSocial: true,
                      codigoUnico: true,
                      email: true,
                      telefono: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!payment) {
        return reply.status(404).send({ error: 'Pago no encontrado' });
      }

      return {
        payment: {
          id: payment.id,
          sourceSystem: payment.sourceSystem,
          method: payment.method,
          status: payment.status,
          externalRef: payment.externalRef,
          createdAt: payment.createdAt,
          settledAt: payment.settledAt,
          updatedAt: payment.updatedAt,
          totalAmount: payment.applications.reduce((sum, app) => sum + app.amount, 0),
          applications: payment.applications.map((app) => ({
            id: app.id,
            invoice: {
              id: app.invoice.id,
              numero: app.invoice.numero,
              monto: app.invoice.monto,
              fechaVto: app.invoice.fechaVto,
              estado: app.invoice.estado,
              customer: app.invoice.customer,
            },
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
            appliedAt: app.appliedAt,
            externalApplicationRef: app.externalApplicationRef,
          })),
        },
      };
    }
  );
}

