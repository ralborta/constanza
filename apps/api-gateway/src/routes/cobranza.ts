import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';

const AGENT_API_KEY = process.env.AGENT_API_KEY;

/** Políticas por defecto si no hay registros en BD */
const DEFAULT_POLITICAS: Record<string, unknown> = {
  max_negociaciones: 3,
  plazo_maximo_dias: 30,
  porcentaje_minimo_pago: 25,
  medios_pago_disponibles: ['transferencia', 'tarjeta', 'efectivo'],
  horario_contacto_inicio: '09:00',
  horario_contacto_fin: '18:00',
  tono_comunicacion: 'profesional_empatico',
};

/**
 * Resuelve tenant para cobranza: por X-API-Key + X-Tenant-Id (notifier) o por JWT (UI).
 */
async function resolveTenantCobranza(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const apiKey = (request.headers['x-api-key'] as string) || (request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '');
  const tenantIdHeader = request.headers['x-tenant-id'] as string | undefined;

  if (AGENT_API_KEY && apiKey === AGENT_API_KEY && tenantIdHeader) {
    return tenantIdHeader;
  }

  try {
    await request.jwtVerify();
    const tenantId = (request as any).user?.tenant_id;
    return tenantId ?? null;
  } catch {
    return null;
  }
}

/**
 * GET /v1/cobranza/politicas
 * Devuelve políticas de cobranza del tenant (para prompt dinámico).
 * Auth: JWT (UI) o X-API-Key + X-Tenant-Id (notifier).
 */
export async function cobranzaRoutes(fastify: FastifyInstance) {
  fastify.get('/cobranza/politicas', async (request, reply) => {
    const tenantId = await resolveTenantCobranza(request, reply);
    if (!tenantId) {
      return reply.status(401).send({
        error: 'No autorizado',
        detail: 'Usa JWT o headers X-API-Key y X-Tenant-Id (con AGENT_API_KEY válida).',
      });
    }

    const rows = await prisma.policyRule.findMany({
      where: { tenantId },
    });

    const result: Record<string, unknown> = { ...DEFAULT_POLITICAS };
    for (const p of rows) {
      const key = p.key.startsWith('cobranza:') ? p.key.replace('cobranza:', '') : p.key;
      try {
        result[key] = typeof p.valueJson === 'object' ? p.valueJson : JSON.parse(String(p.valueJson));
      } catch {
        result[key] = p.valueJson;
      }
    }

    return reply.send(result);
  });
}
