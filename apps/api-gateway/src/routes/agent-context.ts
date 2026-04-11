import { telefonoDigits, telefonoLookupVariants } from '@constanza/phone-digits';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const AGENT_API_KEY = process.env.AGENT_API_KEY;
const OPEN_INVOICE_STATES = ['ABIERTA', 'VENCIDA', 'PARCIAL'] as const;
const PAID_INVOICE_STATES = ['PAGADA', 'SALDADA'] as const;

/**
 * Middleware: valida API key para agentes (email, WhatsApp).
 * Header: X-API-Key: <AGENT_API_KEY> o Authorization: Bearer <AGENT_API_KEY>
 */
async function requireAgentApiKey(request: FastifyRequest, reply: FastifyReply) {
  if (!AGENT_API_KEY) {
    return reply.status(503).send({
      error: 'Agent API no configurada',
      detail: 'AGENT_API_KEY no está definida en el servidor.',
    });
  }
  const authHeader = request.headers.authorization;
  const apiKeyHeader = request.headers['x-api-key'];
  const token = typeof apiKeyHeader === 'string' ? apiKeyHeader : authHeader?.replace(/^Bearer\s+/i, '');
  if (token !== AGENT_API_KEY) {
    return reply.status(401).send({ error: 'API key inválida o faltante' });
  }
}

/**
 * API para que los agentes (OpenAI Email, BuilderBot WhatsApp) obtengan contexto
 * de cliente y facturas y puedan responder con datos reales.
 *
 * Uso:
 * - GET /v1/agent/context?email=cliente@empresa.com
 * - GET /v1/agent/context?phone=5491123456789
 *
 * Autenticación: X-API-Key: <AGENT_API_KEY> o Authorization: Bearer <AGENT_API_KEY>
 */
export async function agentContextRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/agent/context',
    { preHandler: [requireAgentApiKey] },
    async (request, reply) => {
      const { email, phone, scope = 'open' } = request.query as {
        email?: string;
        phone?: string;
        scope?: 'open' | 'paid' | 'all';
      };

      if (!email && !phone) {
        return reply.status(400).send({
          error: 'Se requiere email o phone',
          detail: 'Ejemplo: GET /v1/agent/context?email=cliente@empresa.com o ?phone=5491123456789',
        });
      }

      const customer = await findCustomerByEmailOrPhone({ email, phone });

      if (!customer) {
        return reply.status(404).send({
          error: 'Cliente no encontrado',
          hint: email ? 'Verificar email.' : 'Verificar número de teléfono.',
        });
      }

      const invoiceStateFilter =
        scope === 'open'
          ? { in: [...OPEN_INVOICE_STATES] }
          : scope === 'paid'
            ? { in: [...PAID_INVOICE_STATES] }
            : undefined;

      const invoices = await prisma.invoice.findMany({
        where: {
          customerId: customer.id,
          tenantId: customer.tenantId,
          ...(invoiceStateFilter ? { estado: invoiceStateFilter } : {}),
        },
        include: {
          paymentApplications: true,
        },
        orderBy: [{ fechaVto: 'asc' }, { createdAt: 'desc' }],
        take: scope === 'all' ? 200 : 100,
      });

      const invoicesPayload = invoices.map((inv) => {
        const montoAplicado = inv.paymentApplications.reduce((s, a) => s + a.amount, 0);
        const saldo = inv.monto - montoAplicado;
        return {
          id: inv.id,
          numero: inv.numero,
          monto: inv.monto,
          montoAplicado,
          saldo,
          fechaVto: inv.fechaVto,
          estado: inv.estado,
        };
      });

      const totalPendiente = invoicesPayload
        .filter((i) => OPEN_INVOICE_STATES.includes(i.estado as (typeof OPEN_INVOICE_STATES)[number]))
        .reduce((s, i) => s + i.saldo, 0);
      const totalListado = invoicesPayload.reduce((s, i) => s + i.saldo, 0);

      return {
        scope,
        customer: {
          id: customer.id,
          razonSocial: customer.razonSocial,
          email: customer.email,
          telefono: customer.telefono,
          cuit: customer.customerCuits[0]?.cuit ?? null,
        },
        invoices: invoicesPayload,
        totalPendiente,
        totalListado,
        summaryForAgent: buildSummaryForAgent(customer.razonSocial, scope, invoicesPayload, totalPendiente),
      };
    }
  );

  fastify.post(
    '/agent/actions/promise',
    { preHandler: [requireAgentApiKey] },
    async (request, reply) => {
      const body = z
        .object({
          phone: z.string().optional(),
          email: z.string().email().optional(),
          customerId: z.string().uuid().optional(),
          invoiceId: z.string().uuid().optional(),
          invoiceNumero: z.string().min(1).optional(),
          amountCents: z.number().int().positive().optional(),
          dueDate: z.string().datetime().optional(),
          channel: z.string().default('WHATSAPP'),
          reason: z.string().max(500).optional(),
        })
        .refine((v) => Boolean(v.customerId || v.phone || v.email), {
          message: 'Se requiere customerId, phone o email',
        })
        .parse(request.body);

      const customer = await resolveCustomerForAction(body);
      if (!customer) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }

      const invoice = await resolveInvoiceForAction(customer.id, customer.tenantId, body.invoiceId, body.invoiceNumero);
      if (!invoice) {
        return reply.status(404).send({
          error: 'Factura no encontrada',
          detail: 'Indicá invoiceId/invoiceNumero o que exista factura abierta para el cliente.',
        });
      }

      const promise = await prisma.promise.create({
        data: {
          tenantId: customer.tenantId,
          invoiceId: invoice.id,
          amount: body.amountCents ?? null,
          dueDate: body.dueDate ? new Date(body.dueDate) : invoice.fechaVto,
          channel: body.channel,
          status: 'PENDIENTE',
          reason: body.reason ?? 'Creada por agente',
        },
      });

      return {
        ok: true,
        promise: {
          id: promise.id,
          invoiceId: promise.invoiceId,
          amount: promise.amount,
          dueDate: promise.dueDate,
          status: promise.status,
        },
      };
    }
  );

  fastify.post(
    '/agent/actions/callback',
    { preHandler: [requireAgentApiKey] },
    async (request, reply) => {
      const body = z
        .object({
          phone: z.string().optional(),
          email: z.string().email().optional(),
          customerId: z.string().uuid().optional(),
          invoiceId: z.string().uuid().optional(),
          invoiceNumero: z.string().min(1).optional(),
          scheduledAt: z.string().datetime(),
          type: z.enum(['CALLBACK', 'FOLLOW_UP']).default('CALLBACK'),
          reason: z.string().max(500).optional(),
          sourceContactEventId: z.string().uuid().optional(),
        })
        .refine((v) => Boolean(v.customerId || v.phone || v.email), {
          message: 'Se requiere customerId, phone o email',
        })
        .parse(request.body);

      const customer = await resolveCustomerForAction(body);
      if (!customer) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }

      const invoice = await resolveInvoiceForAction(customer.id, customer.tenantId, body.invoiceId, body.invoiceNumero);

      const callback = await prisma.scheduledCallback.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          invoiceId: invoice?.id ?? null,
          sourceContactEventId: body.sourceContactEventId ?? null,
          scheduledAt: new Date(body.scheduledAt),
          type: body.type,
          reason: body.reason ?? null,
          status: 'PENDING',
        },
      });

      return {
        ok: true,
        callback: {
          id: callback.id,
          scheduledAt: callback.scheduledAt,
          type: callback.type,
          status: callback.status,
          customerId: callback.customerId,
          invoiceId: callback.invoiceId,
        },
      };
    }
  );
}

function buildSummaryForAgent(
  razonSocial: string,
  scope: 'open' | 'paid' | 'all',
  invoices: { numero: string; saldo: number; fechaVto: Date; estado: string }[],
  totalPendiente: number
): string {
  const lines: string[] = [
    `Cliente: ${razonSocial}.`,
    `Total pendiente: $${(totalPendiente / 100).toLocaleString('es-AR')}.`,
  ];
  if (invoices.length > 0) {
    const scopeLabel = scope === 'open' ? 'Facturas abiertas' : scope === 'paid' ? 'Facturas pagadas' : 'Facturas';
    lines.push(
      `${scopeLabel}: ${invoices.map((i) => `#${i.numero} $${(i.saldo / 100).toLocaleString('es-AR')} (vto ${i.fechaVto.toISOString().slice(0, 10)})`).join('; ')}.`
    );
  }
  return lines.join(' ');
}

async function findCustomerByEmailOrPhone(input: { email?: string; phone?: string }) {
  if (input.email) {
    return prisma.customer.findFirst({
      where: { email: input.email, activo: true },
      include: {
        customerCuits: { where: { isPrimary: true }, take: 1 },
      },
    });
  }
  if (input.phone) {
    const want = telefonoDigits(input.phone);
    if (!want) return null;
    const variants = telefonoLookupVariants(want);
    return prisma.customer.findFirst({
      where: {
        activo: true,
        telefonoNormalizado: { in: variants },
      },
      include: {
        customerCuits: { where: { isPrimary: true }, take: 1 },
      },
    });
  }
  return null;
}

async function resolveCustomerForAction(body: {
  customerId?: string;
  phone?: string;
  email?: string;
}) {
  if (body.customerId) {
    return prisma.customer.findFirst({
      where: { id: body.customerId, activo: true },
    });
  }
  return findCustomerByEmailOrPhone({ email: body.email, phone: body.phone });
}

async function resolveInvoiceForAction(
  customerId: string,
  tenantId: string,
  invoiceId?: string,
  invoiceNumero?: string
) {
  if (invoiceId) {
    return prisma.invoice.findFirst({
      where: { id: invoiceId, customerId, tenantId },
    });
  }
  if (invoiceNumero) {
    return prisma.invoice.findFirst({
      where: { numero: invoiceNumero, customerId, tenantId },
    });
  }
  return prisma.invoice.findFirst({
    where: {
      customerId,
      tenantId,
      estado: { in: [...OPEN_INVOICE_STATES] },
    },
    orderBy: { fechaVto: 'asc' },
  });
}
