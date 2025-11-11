import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear tenant de prueba
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Tenant',
      slug: 'demo',
    },
  });

  console.log('✅ Tenant creado:', tenant.id);

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

  console.log('✅ Usuario admin creado:', admin.email);

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

  console.log('✅ Operador 1 creado:', operador1.email);

  // Crear cliente de prueba
  const customerPassword = await bcrypt.hash('cliente123', 10);
  const customer = await prisma.customer.upsert({
    where: {
      tenantId_codigoUnico: {
        tenantId: tenant.id,
        codigoUnico: 'CLI-001',
      },
    },
    update: {},
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

  console.log('✅ Cliente creado:', customer.email);

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

  console.log('✅ CUIT creado para cliente');

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

  console.log('✅ Factura creada:', invoice.numero);

  console.log('🎉 Seeding completado!');
  console.log('\n📝 Credenciales de prueba:');
  console.log('Admin: admin@constanza.com / admin123');
  console.log('Operador 1: operador1@constanza.com / operador123');
  console.log('Cliente: cliente@acme.com / cliente123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

