import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

const querySchema = z.object({
  state: z.enum(['ABIERTA', 'PARCIAL', 'SALDADA']).optional(),
  customer_id: z.string().uuid().optional(),
  fecha_vto_from: z.string().date().optional(),
  fecha_vto_to: z.string().date().optional(),
});

export async function invoiceRoutes(fastify: FastifyInstance) {
  // GET /invoices - Lista facturas con filtros
  fastify.get(
    '/invoices',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const query = querySchema.parse(request.query);

      const where: any = {
        tenantId: user.tenant_id,
      };

      // Si es cliente, solo ve sus propias facturas
      if (user.perfil === 'CLIENTE' && user.customer_id) {
        where.customerId = user.customer_id;
      }

      if (query.state) {
        where.estado = query.state;
      }

      if (query.customer_id) {
        where.customerId = query.customer_id;
      }

      if (query.fecha_vto_from || query.fecha_vto_to) {
        where.fechaVto = {};
        if (query.fecha_vto_from) {
          where.fechaVto.gte = new Date(query.fecha_vto_from);
        }
        if (query.fecha_vto_to) {
          where.fechaVto.lte = new Date(query.fecha_vto_to);
        }
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          customer: {
            include: {
              customerCuits: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          paymentApplications: {
            include: {
              payment: true,
            },
          },
        },
        orderBy: {
          fechaVto: 'asc',
        },
      });

      return {
        invoices: invoices.map((inv) => ({
          id: inv.id,
          customer: {
            id: inv.customer.id,
            razonSocial: inv.customer.razonSocial,
            cuit: inv.customer.customerCuits[0]?.cuit,
          },
          numero: inv.numero,
          monto: inv.monto,
          montoAplicado: inv.paymentApplications.reduce((sum, app) => sum + app.amount, 0),
          fechaVto: inv.fechaVto,
          estado: inv.estado,
          applications: inv.paymentApplications.map((app) => ({
            id: app.id,
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
            appliedAt: app.appliedAt,
          })),
        })),
      };
    }
  );

  // GET /invoices/:id - Detalle de factura con timeline
  fastify.get(
    '/invoices/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const where: any = {
        id,
        tenantId: user.tenant_id,
      };

      // Si es cliente, solo ve sus propias facturas
      if (user.perfil === 'CLIENTE' && user.customer_id) {
        where.customerId = user.customer_id;
      }

      const invoice = await prisma.invoice.findFirst({
        where,
        include: {
          customer: {
            include: {
              customerCuits: true,
            },
          },
          paymentApplications: {
            include: {
              payment: true,
            },
          },
          contactEvents: {
            orderBy: {
              ts: 'desc',
            },
            take: 50,
          },
          promises: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!invoice) {
        return reply.status(404).send({ error: 'Factura no encontrada' });
      }

      return {
        invoice: {
          id: invoice.id,
          customer: {
            id: invoice.customer.id,
            razonSocial: invoice.customer.razonSocial,
            cuits: invoice.customer.customerCuits,
          },
          numero: invoice.numero,
          monto: invoice.monto,
          montoAplicado: invoice.paymentApplications.reduce((sum, app) => sum + app.amount, 0),
          fechaVto: invoice.fechaVto,
          estado: invoice.estado,
          applications: invoice.paymentApplications.map((app) => ({
            id: app.id,
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
            appliedAt: app.appliedAt,
            payment: {
              id: app.payment.id,
              sourceSystem: app.payment.sourceSystem,
              method: app.payment.method,
              status: app.payment.status,
              settledAt: app.payment.settledAt,
            },
          })),
          timeline: [
            ...invoice.contactEvents.map((event) => ({
              type: 'CONTACT',
              channel: event.channel,
              direction: event.direction,
              message: event.messageText,
              status: event.status,
              ts: event.ts,
            })),
            ...invoice.promises.map((promise) => ({
              type: 'PROMISE',
              amount: promise.amount,
              dueDate: promise.dueDate,
              channel: promise.channel,
              status: promise.status,
              ts: promise.createdAt,
            })),
            ...invoice.paymentApplications.map((app) => ({
              type: 'PAYMENT',
              amount: app.amount,
              isAuthoritative: app.isAuthoritative,
              sourceSystem: app.payment.sourceSystem,
              appliedAt: app.appliedAt,
              settledAt: app.payment.settledAt,
            })),
          ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
        },
      };
    }
  );
}

