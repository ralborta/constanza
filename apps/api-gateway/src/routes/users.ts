import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';

const perfilSchema = z.enum(['ADM', 'OPERADOR_1', 'OPERADOR_2']);

const createUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre: z.string().min(1).max(120),
  apellido: z.string().min(1).max(120),
  codigoUnico: z.string().min(1).max(64),
  perfil: perfilSchema,
  /** Si no se envía, se usa la empresa de la sesión. */
  tenantId: z.string().uuid().optional(),
});

const patchUserBody = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
    nombre: z.string().min(1).max(120).optional(),
    apellido: z.string().min(1).max(120).optional(),
    codigoUnico: z.string().min(1).max(64).optional(),
    perfil: perfilSchema.optional(),
    activo: z.boolean().optional(),
    /** Cambiar empresa del usuario (mismo efecto que el UPDATE SQL manual). Debe existir en core.tenants. */
    tenantId: z.string().uuid().optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: 'Enviá al menos un campo para actualizar' });

function userPublic(
  u: {
    id: string;
    tenantId: string;
    email: string;
    nombre: string;
    apellido: string;
    codigoUnico: string;
    perfil: string;
    activo: boolean;
    createdAt: Date;
  },
  tenant?: { name: string; slug: string } | null
) {
  return {
    id: u.id,
    tenantId: u.tenantId,
    tenantName: tenant?.name ?? null,
    tenantSlug: tenant?.slug ?? null,
    email: u.email,
    nombre: u.nombre,
    apellido: u.apellido,
    codigoUnico: u.codigoUnico,
    perfil: u.perfil,
    activo: u.activo,
    createdAt: u.createdAt.toISOString(),
  };
}

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/users',
    { preHandler: [authenticate, requirePerfil(['ADM'])] },
    async (request) => {
      const { tenant_id } = request.user!;
      const users = await prisma.user.findMany({
        where: { tenantId: tenant_id },
        orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
        include: {
          tenant: { select: { name: true, slug: true } },
        },
      });
      return {
        users: users.map((u) => userPublic(u, u.tenant)),
      };
    }
  );

  fastify.post(
    '/users',
    { preHandler: [authenticate, requirePerfil(['ADM'])] },
    async (request, reply) => {
      const body = createUserBody.parse(request.body);
      const { tenant_id } = request.user!;

      const targetTenantId = body.tenantId ?? tenant_id;
      const tenantOk = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
      if (!tenantOk) {
        return reply.status(400).send({ error: 'Empresa (tenant) inválida' });
      }

      const passwordHash = await bcrypt.hash(body.password, 10);

      try {
        const created = await prisma.user.create({
          data: {
            tenantId: targetTenantId,
            email: body.email.trim().toLowerCase(),
            passwordHash,
            nombre: body.nombre.trim(),
            apellido: body.apellido.trim(),
            codigoUnico: body.codigoUnico.trim(),
            perfil: body.perfil,
            activo: true,
          },
        });
        const t = await prisma.tenant.findUnique({
          where: { id: created.tenantId },
          select: { name: true, slug: true },
        });
        return reply.status(201).send({ user: userPublic(created, t) });
      } catch (e: unknown) {
        fastify.log.error({ e }, 'create user failed');
        throw e;
      }
    }
  );

  fastify.patch(
    '/users/:id',
    { preHandler: [authenticate, requirePerfil(['ADM'])] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = patchUserBody.parse(request.body);
      const { tenant_id } = request.user!;

      const existing = await prisma.user.findFirst({
        where: { id, tenantId: tenant_id },
      });
      if (!existing) {
        return reply.status(404).send({ error: 'Usuario no encontrado' });
      }

      if (body.tenantId !== undefined) {
        const t = await prisma.tenant.findUnique({ where: { id: body.tenantId } });
        if (!t) {
          return reply.status(400).send({ error: 'Empresa (tenant) inválida' });
        }
      }

      const data: Record<string, unknown> = {};
      if (body.nombre !== undefined) data.nombre = body.nombre.trim();
      if (body.apellido !== undefined) data.apellido = body.apellido.trim();
      if (body.email !== undefined) data.email = body.email.trim().toLowerCase();
      if (body.codigoUnico !== undefined) data.codigoUnico = body.codigoUnico.trim();
      if (body.perfil !== undefined) data.perfil = body.perfil;
      if (body.activo !== undefined) data.activo = body.activo;
      if (body.tenantId !== undefined) data.tenantId = body.tenantId;
      if (body.password !== undefined) {
        data.passwordHash = await bcrypt.hash(body.password, 10);
      }

      try {
        const updated = await prisma.user.update({
          where: { id, tenantId: tenant_id },
          data: data as any,
        });
        const t = await prisma.tenant.findUnique({
          where: { id: updated.tenantId },
          select: { name: true, slug: true },
        });
        return { user: userPublic(updated, t) };
      } catch (e: unknown) {
        fastify.log.error({ e }, 'patch user failed');
        throw e;
      }
    }
  );
}
