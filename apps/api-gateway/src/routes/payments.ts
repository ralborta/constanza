import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { withTenantRls } from '../lib/tenant-rls.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import {
  buildCresiumConciliationCandidates,
  type ConciliationCandidate,
} from '../services/cresium-conciliation-candidates.js';

/** Monto mostrado: suma de applications, o total declarado por el origen si aún no hay imputación. */
function transferTotalCents(payment: {
  applications: { amount: number }[];
  totalAmountCents?: number | null;
}): number {
  const fromApps = payment.applications.reduce((s, a) => s + a.amount, 0);
  return fromApps > 0 ? fromApps : payment.totalAmountCents ?? 0;
}

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
      const take = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));
      const skip = Math.max(0, parseInt(String(offset), 10) || 0);

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

      return withTenantRls(user, async (tx) => {
        const payments = await tx.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip,
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

        const total = await tx.payment.count({ where });

        const totalAmount = payments.reduce((sum, payment) => sum + transferTotalCents(payment), 0);

        return {
          transfers: payments.map((payment) => ({
            id: payment.id,
            sourceSystem: payment.sourceSystem,
            status: payment.status,
            externalRef: payment.externalRef,
            createdAt: payment.createdAt,
            settledAt: payment.settledAt,
            totalAmount: transferTotalCents(payment),
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
          limit: take,
          offset: skip,
        };
      });
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

      const pendingEnriched = await Promise.all(
        pendingLiquidation.map(async (payment) => {
          const base = {
            id: payment.id,
            sourceSystem: payment.sourceSystem,
            method: payment.method,
            status: payment.status,
            externalRef: payment.externalRef,
            createdAt: payment.createdAt,
            totalAmount: transferTotalCents(payment),
            applications: payment.applications.map((app) => ({
              invoice: {
                numero: app.invoice.numero,
                customer: app.invoice.customer.razonSocial,
              },
              amount: app.amount,
              isAuthoritative: app.isAuthoritative,
            })),
            metadata: payment.metadata ?? null,
            extractedTaxIds: null as string[] | null,
            candidates: [] as ConciliationCandidate[],
          };

          if (payment.sourceSystem === 'CRESIUM' && payment.applications.length === 0) {
            const { extractedTaxIds, candidates } = await buildCresiumConciliationCandidates(
              user.tenant_id,
              {
                totalAmountCents: payment.totalAmountCents,
                metadata: payment.metadata,
              }
            );
            base.extractedTaxIds = extractedTaxIds;
            base.candidates = candidates;
          }

          return base;
        })
      );

      // Pagos autoritativos (Cresium) vs manuales
      const authoritativePayments = await prisma.payment.findMany({
        where: {
          tenantId: user.tenant_id,
          sourceSystem: 'CRESIUM',
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
        return payments.reduce((sum, payment) => sum + transferTotalCents(payment), 0);
      };

      return {
        pendingLiquidation: pendingEnriched,
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

      if (body.action === 'LIQUIDATE') {
        const appCount = await prisma.paymentApplication.count({
          where: { paymentId: payment.id },
        });
        if (appCount === 0) {
          return reply.status(400).send({
            error:
              'No se puede liquidar sin imputación a factura. Usá POST /v1/payments/:id/impute o esperá el match automático.',
          });
        }
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

  // POST /payments/:paymentId/impute — imputar a factura un depósito Cresium sin match automático
  fastify.post(
    '/payments/:paymentId/impute',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { paymentId } = request.params as { paymentId: string };
      const body = z.object({ invoiceId: z.string().uuid() }).parse(request.body);

      const payment = await prisma.payment.findFirst({
        where: { id: paymentId, tenantId: user.tenant_id, sourceSystem: 'CRESIUM' },
        include: { applications: true },
      });

      if (!payment) {
        return reply.status(404).send({ error: 'Pago Cresium no encontrado' });
      }
      if (payment.applications.length > 0) {
        return reply.status(400).send({ error: 'El pago ya tiene imputaciones' });
      }
      const cents = payment.totalAmountCents ?? 0;
      if (cents <= 0) {
        return reply.status(400).send({ error: 'Sin monto pendiente de imputar' });
      }
      if (payment.status !== 'PEND_LIQ') {
        return reply.status(400).send({ error: `Estado no válido para imputar: ${payment.status}` });
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id: body.invoiceId, tenantId: user.tenant_id },
        include: { paymentApplications: true },
      });
      if (!invoice) {
        return reply.status(404).send({ error: 'Factura no encontrada' });
      }

      const applied = invoice.paymentApplications.reduce((s, a) => s + a.amount, 0);
      const pendingInvoice = invoice.monto - applied;
      if (cents > pendingInvoice) {
        return reply.status(400).send({
          error: `El monto del depósito (${cents}) supera el saldo pendiente de la factura (${pendingInvoice}).`,
        });
      }

      await prisma.paymentApplication.create({
        data: {
          tenantId: user.tenant_id,
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: cents,
          isAuthoritative: true,
          appliedAt: new Date(),
          externalApplicationRef: `cresium-impute:${payment.externalRef ?? payment.id}`,
        },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          totalAmountCents: null,
          status: 'LIQUIDADO',
          settledAt: new Date(),
        },
      });

      fastify.log.info(
        { paymentId: payment.id, invoiceId: invoice.id, amount: cents, userId: user.user_id },
        'Cresium payment imputed manually'
      );

      return {
        ok: true,
        paymentId: payment.id,
        invoiceId: invoice.id,
        amount: cents,
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
          totalAmount: transferTotalCents(payment),
          unappliedAmountCents: payment.totalAmountCents,
          metadata: payment.metadata ?? null,
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

