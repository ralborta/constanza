import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

/**
 * Listado de empresas (tenants) para asignar usuarios sin usar SQL.
 * Solo ADM. En instalaciones multi-empresa permite mover un usuario a otra empresa.
 */
export async function tenantsListRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/tenants',
    { preHandler: [authenticate, requirePerfil(['ADM'])] },
    async () => {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });
      return { tenants };
    }
  );
}
