import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

const createCustomerSchema = z.object({
  codigoUnico: z.string(),
  codigoVenta: z.string().default('000'),
  razonSocial: z.string(),
  email: z.string().email(),
  telefono: z.string().optional(),
  cuits: z
    .array(
      z.object({
        cuit: z.string(),
        razonSocial: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
});

export async function customerRoutes(fastify: FastifyInstance) {
  // GET /customers - Lista clientes
  fastify.get(
    '/customers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;

      const customers = await prisma.customer.findMany({
        where: {
          tenantId: user.tenant_id,
        },
        include: {
          customerCuits: true,
        },
        orderBy: {
          razonSocial: 'asc',
        },
      });

      return {
        customers: customers.map((c) => ({
          id: c.id,
          codigoUnico: c.codigoUnico,
          codigoVenta: c.codigoVenta,
          razonSocial: c.razonSocial,
          email: c.email,
          telefono: c.telefono,
          activo: c.activo,
          accesoHabilitado: c.accesoHabilitado,
          cuits: c.customerCuits,
        })),
      };
    }
  );

  // POST /customers - Crear cliente
  fastify.post(
    '/customers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = createCustomerSchema.parse(request.body);

      // Verificar que codigo_unico no exista
      const existing = await prisma.customer.findFirst({
        where: {
          tenantId: user.tenant_id,
          codigoUnico: body.codigoUnico,
        },
      });

      if (existing) {
        return reply.status(409).send({ error: 'Código único ya existe' });
      }

      // Verificar que email no exista
      const existingEmail = await prisma.customer.findFirst({
        where: {
          tenantId: user.tenant_id,
          email: body.email,
        },
      });

      if (existingEmail) {
        return reply.status(409).send({ error: 'Email ya existe' });
      }

      const customer = await prisma.customer.create({
        data: {
          tenantId: user.tenant_id,
          codigoUnico: body.codigoUnico,
          codigoVenta: body.codigoVenta,
          razonSocial: body.razonSocial,
          email: body.email,
          telefono: body.telefono,
          activo: true,
          accesoHabilitado: false,
          customerCuits: body.cuits
            ? {
                create: body.cuits.map((cuit) => ({
                  tenantId: user.tenant_id,
                  cuit: cuit.cuit,
                  razonSocial: cuit.razonSocial,
                  isPrimary: cuit.isPrimary,
                })),
              }
            : undefined,
        },
        include: {
          customerCuits: true,
        },
      });

      return {
        customer: {
          id: customer.id,
          codigoUnico: customer.codigoUnico,
          codigoVenta: customer.codigoVenta,
          razonSocial: customer.razonSocial,
          email: customer.email,
          telefono: customer.telefono,
          cuits: customer.customerCuits,
        },
      };
    }
  );
}

