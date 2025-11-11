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
  });

  // Login clientes
  fastify.post('/customer/login', async (request, reply) => {
    const body = customerLoginSchema.parse(request.body);

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

