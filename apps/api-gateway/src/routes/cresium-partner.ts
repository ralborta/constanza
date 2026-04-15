import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getCresiumPartnerConfig, cresiumPartnerFetch } from '../lib/cresium-partner-api.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

const signatureRequestPutBody = z.object({
  status: z.enum(['CANCELED', 'PENDING', 'SIGNED']),
  rejectionReason: z
    .enum(['INVALID_DATA', 'DUPLICATED', 'NOT_AUTHORIZED', 'INSUFFICIENT_FUNDS', 'EXPIRED', 'OTHER'])
    .optional(),
  rejectionNote: z.string().optional(),
});

/**
 * Proxy a API Partner Cresium v3 (misma company que CRESIUM_COMPANY_ID).
 * Requiere variables de entorno en api-gateway (no en el cliente).
 */
export async function cresiumPartnerRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/integrations/cresium/transaction/:id',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const cfg = getCresiumPartnerConfig();
      if (!cfg) {
        return reply.status(503).send({
          error:
            'Cresium Partner API no configurada. Definí CRESIUM_PARTNER_API_KEY (o CRESIUM_API_KEY), CRESIUM_PARTNER_SECRET (o CRESIUM_SECRET) y CRESIUM_COMPANY_ID.',
        });
      }
      const id = z.coerce.number().int().positive().parse((request.params as { id: string }).id);
      const path = `/v3/transaction/${id}`;
      const result = await cresiumPartnerFetch(cfg, 'GET', path);
      return reply.status(result.status).send(result.json);
    }
  );

  fastify.put(
    '/integrations/cresium/signature-request/:id',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const cfg = getCresiumPartnerConfig();
      if (!cfg) {
        return reply.status(503).send({
          error:
            'Cresium Partner API no configurada. Definí CRESIUM_PARTNER_API_KEY (o CRESIUM_API_KEY), CRESIUM_PARTNER_SECRET (o CRESIUM_SECRET) y CRESIUM_COMPANY_ID.',
        });
      }
      const id = z.coerce.number().int().nonnegative().parse((request.params as { id: string }).id);
      const body = signatureRequestPutBody.parse(request.body);
      const path = `/v3/signature-request/${id}`;
      const result = await cresiumPartnerFetch(cfg, 'PUT', path, body);
      return reply.status(result.status).send(result.json);
    }
  );
}
