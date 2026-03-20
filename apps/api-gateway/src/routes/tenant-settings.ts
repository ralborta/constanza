import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

export async function tenantSettingsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/tenant/cresium',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request) => {
      const user = request.user!;
      const t = await prisma.tenant.findUnique({
        where: { id: user.tenant_id },
        select: { id: true, name: true, cresiumCvuCobro: true },
      });
      return { tenantId: t?.id, name: t?.name, cresiumCvuCobro: t?.cresiumCvuCobro ?? null };
    }
  );

  fastify.patch(
    '/tenant/cresium',
    {
      preHandler: [authenticate, requirePerfil(['ADM'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = z
        .object({
          cresiumCvuCobro: z.union([z.string(), z.null()]).optional(),
        })
        .parse(request.body);

      if (body.cresiumCvuCobro === undefined) {
        return reply.status(400).send({ error: 'cresiumCvuCobro requerido para actualizar (o null para borrar)' });
      }

      let cvu: string | null;
      if (body.cresiumCvuCobro === null || String(body.cresiumCvuCobro).trim() === '') {
        cvu = null;
      } else {
        cvu = String(body.cresiumCvuCobro).replace(/\D/g, '');
        if (cvu.length < 8 || cvu.length > 22) {
          return reply.status(400).send({ error: 'CVU inválido (solo dígitos, 8–22)' });
        }
      }

      const updated = await prisma.tenant.update({
        where: { id: user.tenant_id },
        data: { cresiumCvuCobro: cvu },
        select: { id: true, cresiumCvuCobro: true },
      });

      fastify.log.info({ tenantId: updated.id, userId: user.user_id }, 'Tenant Cresium CVU updated');

      return { ok: true, cresiumCvuCobro: updated.cresiumCvuCobro };
    }
  );
}
