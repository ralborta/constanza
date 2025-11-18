import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

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

    // 🔥 TEMPORAL: Usuario fake para desarrollo sin DB
    // TODO: Remover cuando la DB esté lista
    if (body.email === 'admin@constanza.com' && body.password === 'admin123') {
      // Intentar obtener un tenant real de la DB primero
      let tenantId: string;
      try {
        const tenant = await prisma.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
        });
        if (tenant) {
          tenantId = tenant.id;
          fastify.log.info({ tenantId }, 'Using real tenant from DB for fake user');
        } else {
          // Si no hay tenant, usar un UUID válido temporal
          tenantId = '00000000-0000-0000-0000-000000000001';
          fastify.log.warn('No tenant found in DB, using temporary UUID');
        }
      } catch (error) {
        // Si falla la DB, usar UUID válido temporal
        tenantId = '00000000-0000-0000-0000-000000000001';
        fastify.log.warn({ error }, 'DB error, using temporary UUID for fake user');
      }
      
      const fakeUserId = '00000000-0000-0000-0000-000000000002';
      
      const token = fastify.jwt.sign({
        tenant_id: tenantId,
        user_id: fakeUserId,
        perfil: 'ADM' as const,
      });

      return {
        token,
        user: {
          id: fakeUserId,
          nombre: 'Admin',
          apellido: 'Sistema',
          email: 'admin@constanza.com',
          perfil: 'ADM',
        },
      };
    }

    // Intenta login real con DB (puede fallar si DB no está disponible)
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

      if (!user) {
        return reply.status(401).send({ error: 'Credenciales inválidas' });
      }

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
    } catch (error: any) {
      // Si falla la DB, devuelve error pero permite el usuario fake
      fastify.log.warn({ error: error.message }, 'Error consultando DB, usando usuario fake si aplica');
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }
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
          // Si no hay tenant, usar un UUID válido temporal
          tenantId = '00000000-0000-0000-0000-000000000001';
          fastify.log.warn('No tenant found in DB, using temporary UUID');
        }
      } catch (error) {
        // Si falla la DB, usar UUID válido temporal
        tenantId = '00000000-0000-0000-0000-000000000001';
        fastify.log.warn({ error }, 'DB error, using temporary UUID for fake customer');
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
}

