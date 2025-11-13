import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

export async function seedRoutes(fastify: FastifyInstance) {
  // Endpoint temporal para ejecutar seed
  // Solo disponible si SEED_SECRET está configurado y coincide
  fastify.post('/seed', async (request, reply) => {
    const secret = request.headers['x-seed-secret'] as string;
    const expectedSecret = process.env.SEED_SECRET;

    if (!expectedSecret) {
      return reply.status(503).send({ error: 'Seed endpoint no configurado' });
    }

    if (secret !== expectedSecret) {
      return reply.status(401).send({ error: 'Secret inválido' });
    }

    try {
      fastify.log.info('🌱 Iniciando seed de base de datos...');

      // Crear tenant de prueba
      const tenant = await prisma.tenant.upsert({
        where: { slug: 'demo' },
        update: {},
        create: {
          name: 'Demo Tenant',
          slug: 'demo',
        },
      });

      fastify.log.info({ tenantId: tenant.id }, '✅ Tenant creado');

      // Crear usuario admin
      const adminPassword = await bcrypt.hash('admin123', 10);
      const admin = await prisma.user.upsert({
        where: {
          tenantId_codigoUnico: {
            tenantId: tenant.id,
            codigoUnico: 'ADM-001',
          },
        },
        update: {
          passwordHash: adminPassword,
        },
        create: {
          tenantId: tenant.id,
          codigoUnico: 'ADM-001',
          nombre: 'Admin',
          apellido: 'Sistema',
          email: 'admin@constanza.com',
          passwordHash: adminPassword,
          perfil: 'ADM',
          activo: true,
        },
      });

      fastify.log.info({ email: admin.email }, '✅ Usuario admin creado');

      // Crear operador 1
      const op1Password = await bcrypt.hash('operador123', 10);
      const operador1 = await prisma.user.upsert({
        where: {
          tenantId_codigoUnico: {
            tenantId: tenant.id,
            codigoUnico: 'OP-001',
          },
        },
        update: {
          passwordHash: op1Password,
        },
        create: {
          tenantId: tenant.id,
          codigoUnico: 'OP-001',
          nombre: 'Juan',
          apellido: 'Pérez',
          email: 'operador1@constanza.com',
          passwordHash: op1Password,
          perfil: 'OPERADOR_1',
          activo: true,
        },
      });

      fastify.log.info({ email: operador1.email }, '✅ Operador 1 creado');

      // Crear cliente de prueba
      const customerPassword = await bcrypt.hash('cliente123', 10);
      const customer = await prisma.customer.upsert({
        where: {
          tenantId_codigoUnico: {
            tenantId: tenant.id,
            codigoUnico: 'CLI-001',
          },
        },
        update: {
          passwordHash: customerPassword,
          accesoHabilitado: true,
        },
        create: {
          tenantId: tenant.id,
          codigoUnico: 'CLI-001',
          codigoVenta: '000',
          razonSocial: 'Acme Inc',
          email: 'cliente@acme.com',
          passwordHash: customerPassword,
          telefono: '+5491123456789',
          activo: true,
          accesoHabilitado: true,
        },
      });

      fastify.log.info({ email: customer.email }, '✅ Cliente creado');

      // Crear CUIT para el cliente
      await prisma.customerCuit.upsert({
        where: {
          tenantId_cuit: {
            tenantId: tenant.id,
            cuit: '20123456789',
          },
        },
        update: {},
        create: {
          tenantId: tenant.id,
          customerId: customer.id,
          cuit: '20123456789',
          razonSocial: 'Acme Inc',
          isPrimary: true,
        },
      });

      fastify.log.info('✅ CUIT creado para cliente');

      // Crear factura de prueba
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          numero: 'FAC-001',
          monto: 120000, // $1,200.00
          fechaVto: new Date('2025-12-31'),
          estado: 'ABIERTA',
        },
      });

      fastify.log.info({ numero: invoice.numero }, '✅ Factura creada');

      return {
        success: true,
        message: 'Seed ejecutado exitosamente',
        credentials: {
          admin: { email: 'admin@constanza.com', password: 'admin123' },
          operador: { email: 'operador1@constanza.com', password: 'operador123' },
          cliente: { email: 'cliente@acme.com', password: 'cliente123' },
        },
      };
    } catch (error: any) {
      fastify.log.error({ error: error.message }, '❌ Error en seed');
      return reply.status(500).send({
        error: 'Error ejecutando seed',
        message: error.message,
      });
    }
  });
}

