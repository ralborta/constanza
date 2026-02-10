import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

const AGENT_API_KEY = process.env.AGENT_API_KEY;

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
      const { email, phone } = request.query as { email?: string; phone?: string };

      if (!email && !phone) {
        return reply.status(400).send({
          error: 'Se requiere email o phone',
          detail: 'Ejemplo: GET /v1/agent/context?email=cliente@empresa.com o ?phone=5491123456789',
        });
      }

      let customer = await (async () => {
        if (email) {
          return prisma.customer.findFirst({
            where: { email, activo: true },
            include: {
              customerCuits: { where: { isPrimary: true }, take: 1 },
            },
          });
        }
        if (phone) {
          const normalizeDigits = (s: string | null) => (s || '').replace(/\D/g, '');
          const want = normalizeDigits(phone);
          const candidates = await prisma.customer.findMany({
            where: { activo: true, telefono: { not: null } },
            include: {
              customerCuits: { where: { isPrimary: true }, take: 1 },
            },
          });
          return candidates.find((c) => normalizeDigits(c.telefono) === want)
            ?? candidates.find((c) => c.telefono?.includes(want))
            ?? null;
        }
        return null;
      })();

      if (!customer) {
        return reply.status(404).send({
          error: 'Cliente no encontrado',
          hint: email ? 'Verificar email.' : 'Verificar número de teléfono.',
        });
      }

      const invoices = await prisma.invoice.findMany({
        where: {
          customerId: customer.id,
          tenantId: customer.tenantId,
          estado: { in: ['ABIERTA', 'VENCIDA', 'PARCIAL'] },
        },
        include: {
          paymentApplications: true,
        },
        orderBy: { fechaVto: 'asc' },
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

      const totalPendiente = invoicesPayload.reduce((s, i) => s + i.saldo, 0);

      return {
        customer: {
          id: customer.id,
          razonSocial: customer.razonSocial,
          email: customer.email,
          telefono: customer.telefono,
          cuit: customer.customerCuits[0]?.cuit ?? null,
        },
        invoices: invoicesPayload,
        totalPendiente,
        summaryForAgent: buildSummaryForAgent(customer.razonSocial, invoicesPayload, totalPendiente),
      };
    }
  );
}

function buildSummaryForAgent(
  razonSocial: string,
  invoices: { numero: string; saldo: number; fechaVto: Date; estado: string }[],
  totalPendiente: number
): string {
  const lines: string[] = [
    `Cliente: ${razonSocial}.`,
    `Total pendiente: $${(totalPendiente / 100).toLocaleString('es-AR')}.`,
  ];
  if (invoices.length > 0) {
    lines.push(
      `Facturas abiertas: ${invoices.map((i) => `#${i.numero} $${(i.saldo / 100).toLocaleString('es-AR')} (vto ${i.fechaVto.toISOString().slice(0, 10)})`).join('; ')}.`
    );
  }
  return lines.join(' ');
}
