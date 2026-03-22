import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const customerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Login empleados/operadores
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // 1) Siempre intentar login real primero (evita 503 por el bypass "fake" cuando la DB sí tiene usuario admin).
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: body.email,
          activo: true,
        },
        include: {
          tenant: true,
        },
      });

      if (user) {
        if (!user.passwordHash) {
          return reply.status(401).send({ error: 'Usuario sin contraseña configurada' });
        }
        const isValid = await bcrypt.compare(body.password, user.passwordHash);
        if (!isValid) {
          return reply.status(401).send({ error: 'Credenciales inválidas' });
        }

        const token = fastify.jwt.sign({
          tenant_id: user.tenantId,
          user_id: user.id,
          perfil: user.perfil as 'ADM' | 'OPERADOR_1' | 'OPERADOR_2',
        });

        return {
          token,
          user: {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            perfil: user.perfil,
          },
        };
      }
    } catch (error: unknown) {
      fastify.log.error({ error }, 'login: error consultando usuario');
      return reply.status(503).send({
        error: 'Base de datos no disponible. Revisá DATABASE_URL en Railway y que Postgres esté activo.',
      });
    }

    // 2) Solo desarrollo: admin demo sin fila en users (o entorno vacío tras migraciones)
    if (body.email === 'admin@constanza.com' && body.password === 'admin123') {
      try {
        const tenant = await prisma.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        });

        if (!tenant) {
          return reply.status(503).send({
            error:
              'No hay tenant en la base. Ejecutá la migración 007 o `pnpm seed` en infra/prisma.',
          });
        }

        const adminUser = await prisma.user.findFirst({
          where: { tenantId: tenant.id, perfil: 'ADM', activo: true },
          orderBy: { createdAt: 'asc' },
        });
        const anyUser = await prisma.user.findFirst({
          where: { tenantId: tenant.id, activo: true },
          orderBy: { createdAt: 'asc' },
        });

        const userId =
          adminUser?.id ?? anyUser?.id ?? '00000000-0000-0000-0000-000000000002';

        const token = fastify.jwt.sign({
          tenant_id: tenant.id,
          user_id: userId,
          perfil: 'ADM' as const,
        });

        return {
          token,
          user: {
            id: userId,
            nombre: adminUser?.nombre ?? 'Admin',
            apellido: adminUser?.apellido ?? 'Sistema',
            email: 'admin@constanza.com',
            perfil: 'ADM',
          },
        };
      } catch (error: unknown) {
        fastify.log.error({ error }, 'login dev bypass failed');
        return reply.status(503).send({
          error: 'No se pudo completar el login de desarrollo. Revisá la conexión a la base.',
        });
      }
    }

    return reply.status(401).send({ error: 'Credenciales inválidas' });
  });

  // Login clientes
  fastify.post('/customer/login', async (request, reply) => {
    const body = customerLoginSchema.parse(request.body);

    // 🔥 TEMPORAL: Cliente fake para desarrollo sin DB
    // TODO: Remover cuando la DB esté lista
    if (body.email === 'cliente@acme.com' && body.password === 'cliente123') {
      // Intentar obtener un tenant real de la DB primero
      let tenantId: string;
      try {
        const tenant = await prisma.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (tenant) {
          tenantId = tenant.id;
          fastify.log.info({ tenantId }, 'Using real tenant from DB for fake customer');
        } else {
          fastify.log.error('No hay tenant en DB para login cliente fake');
          return reply.status(503).send({
            error:
              'Servidor sin datos de empresa (tenant). Ejecutá el seed o la migración SQL 007 en la base.',
          });
        }
      } catch (error) {
        fastify.log.error({ error }, 'Error leyendo tenant para login cliente fake');
        return reply.status(503).send({
          error: 'No se pudo verificar la base de datos.',
        });
      }
      
      const fakeCustomerId = '00000000-0000-0000-0000-000000000003';
      
      const token = fastify.jwt.sign({
        tenant_id: tenantId,
        customer_id: fakeCustomerId,
        perfil: 'CLIENTE',
      });

      return {
        token,
        customer: {
          id: fakeCustomerId,
          razonSocial: 'Acme Inc',
          email: 'cliente@acme.com',
          perfil: 'CLIENTE',
        },
      };
    }

    // Intenta login real con DB (puede fallar si DB no está disponible)
    try {
      const customer = await prisma.customer.findFirst({
        where: {
          email: body.email,
          activo: true,
          accesoHabilitado: true,
        },
      });

      if (!customer || !customer.passwordHash) {
        return reply.status(401).send({ error: 'Credenciales inválidas o acceso no habilitado' });
      }

      const isValid = await bcrypt.compare(body.password, customer.passwordHash);
      if (!isValid) {
        return reply.status(401).send({ error: 'Credenciales inválidas' });
      }

      const token = fastify.jwt.sign({
        tenant_id: customer.tenantId,
        customer_id: customer.id,
        perfil: 'CLIENTE',
      });

      return {
        token,
        customer: {
          id: customer.id,
          razonSocial: customer.razonSocial,
          email: customer.email,
          perfil: 'CLIENTE',
        },
      };
    } catch (error: any) {
      // Si falla la DB, devuelve error pero permite el cliente fake
      fastify.log.warn({ error: error.message }, 'Error consultando DB, usando cliente fake si aplica');
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
  });

  // Verificar token
  fastify.get('/verify', async (request, reply) => {
    try {
      await request.jwtVerify();
      return { valid: true };
    } catch (err) {
      return reply.status(401).send({ valid: false, error: 'Token inválido' });
    }
  });

  /**
   * Sesión actual (JWT): tenant y usuario. Sirve para alinear CRESIUM_TENANT_ID / depósitos con el login.
   * GET /auth/me
   */
  fastify.get(
    '/me',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const jwt = request.user!;
      if (jwt.perfil === 'CLIENTE') {
        return reply.status(403).send({ error: 'Solo usuarios internos' });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: jwt.tenant_id },
        select: { id: true, name: true, slug: true },
      });

      const dbUser = jwt.user_id
        ? await prisma.user.findUnique({
            where: { id: jwt.user_id },
            select: { id: true, email: true, codigoUnico: true },
          })
        : null;

      return {
        tenantId: jwt.tenant_id,
        tenantName: tenant?.name ?? null,
        tenantSlug: tenant?.slug ?? null,
        perfil: jwt.perfil,
        userId: jwt.user_id ?? null,
        email: dbUser?.email ?? null,
        codigoUnico: dbUser?.codigoUnico ?? null,
      };
    }
  );
}

