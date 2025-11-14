import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import * as XLSX from 'xlsx';

const createCustomerSchema = z.object({
  codigoUnico: z.string(),
  codigoVenta: z.string().default('000'),
  razonSocial: z.string(),
  email: z.string().email(),
  telefono: z.string().optional(),
  cuits: z
    .array(
      z.object({
        cuit: z.string(),
        razonSocial: z.string().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .optional(),
});

interface ExcelRow {
  'Código Único'?: string;
  'Razón Social'?: string;
  'Email'?: string;
  'Teléfono'?: string;
  'CUIT'?: string;
  'Código Venta'?: string;
}

export async function customerRoutes(fastify: FastifyInstance) {
  // GET /customers - Lista clientes
  fastify.get(
    '/customers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;

      const customers = await prisma.customer.findMany({
        where: {
          tenantId: user.tenant_id,
        },
        include: {
          customerCuits: true,
        },
        orderBy: {
          razonSocial: 'asc',
        },
      });

      return {
        customers: customers.map((c) => ({
          id: c.id,
          codigoUnico: c.codigoUnico,
          codigoVenta: c.codigoVenta,
          razonSocial: c.razonSocial,
          email: c.email,
          telefono: c.telefono,
          activo: c.activo,
          accesoHabilitado: c.accesoHabilitado,
          cuits: c.customerCuits,
        })),
      };
    }
  );

  // POST /customers - Crear cliente
  fastify.post(
    '/customers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = createCustomerSchema.parse(request.body);

      // Verificar que codigo_unico no exista
      const existing = await prisma.customer.findFirst({
        where: {
          tenantId: user.tenant_id,
          codigoUnico: body.codigoUnico,
        },
      });

      if (existing) {
        return reply.status(409).send({ error: 'Código único ya existe' });
      }

      // Verificar que email no exista
      const existingEmail = await prisma.customer.findFirst({
        where: {
          tenantId: user.tenant_id,
          email: body.email,
        },
      });

      if (existingEmail) {
        return reply.status(409).send({ error: 'Email ya existe' });
      }

      const customer = await prisma.customer.create({
        data: {
          tenantId: user.tenant_id,
          codigoUnico: body.codigoUnico,
          codigoVenta: body.codigoVenta,
          razonSocial: body.razonSocial,
          email: body.email,
          telefono: body.telefono,
          activo: true,
          accesoHabilitado: false,
          customerCuits: body.cuits
            ? {
                create: body.cuits.map((cuit) => ({
                  tenantId: user.tenant_id,
                  cuit: cuit.cuit,
                  razonSocial: cuit.razonSocial,
                  isPrimary: cuit.isPrimary,
                })),
              }
            : undefined,
        },
        include: {
          customerCuits: true,
        },
      });

      return {
        customer: {
          id: customer.id,
          codigoUnico: customer.codigoUnico,
          codigoVenta: customer.codigoVenta,
          razonSocial: customer.razonSocial,
          email: customer.email,
          telefono: customer.telefono,
          cuits: customer.customerCuits,
        },
      };
    }
  );

  // POST /customers/upload - Cargar clientes desde Excel
  fastify.post(
    '/customers/upload',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;

      try {
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({ error: 'No se envió ningún archivo' });
        }

        // Verificar que sea un archivo Excel
        const filename = data.filename.toLowerCase();
        if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
          return reply.status(400).send({ error: 'El archivo debe ser Excel (.xlsx o .xls)' });
        }

        // Leer el archivo
        const buffer = await data.toBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          return reply.status(400).send({ error: 'El archivo Excel está vacío' });
        }

        fastify.log.info({ rowsCount: rows.length }, 'Processing Excel file');

        const results = {
          created: 0,
          skipped: 0,
          errors: [] as Array<{ row: number; error: string }>,
        };

        // Procesar cada fila
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la fila 1 es el header

          try {
            // Validar campos requeridos
            if (!row['Código Único']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Código Único"' });
              results.skipped++;
              continue;
            }

            if (!row['Razón Social']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Razón Social"' });
              results.skipped++;
              continue;
            }

            if (!row['Email']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Email"' });
              results.skipped++;
              continue;
            }

            // Validar email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(row['Email']!)) {
              results.errors.push({ row: rowNumber, error: 'Email inválido' });
              results.skipped++;
              continue;
            }

            const codigoUnico = String(row['Código Único']).trim();
            const razonSocial = String(row['Razón Social']).trim();
            const email = String(row['Email']).trim().toLowerCase();
            const telefono = row['Teléfono'] ? String(row['Teléfono']).trim() : undefined;
            const cuit = row['CUIT'] ? String(row['CUIT']).trim() : undefined;
            const codigoVenta = row['Código Venta'] ? String(row['Código Venta']).trim() : '000';

            // Verificar si ya existe
            const existing = await prisma.customer.findFirst({
              where: {
                tenantId: user.tenant_id,
                OR: [
                  { codigoUnico },
                  { email },
                ],
              },
            });

            if (existing) {
              results.errors.push({
                row: rowNumber,
                error: `Ya existe un cliente con código "${codigoUnico}" o email "${email}"`,
              });
              results.skipped++;
              continue;
            }

            // Crear cliente
            const customer = await prisma.customer.create({
              data: {
                tenantId: user.tenant_id,
                codigoUnico,
                codigoVenta,
                razonSocial,
                email,
                telefono,
                activo: true,
                accesoHabilitado: false,
                customerCuits: cuit
                  ? {
                      create: {
                        tenantId: user.tenant_id,
                        cuit,
                        razonSocial,
                        isPrimary: true,
                      },
                    }
                  : undefined,
              },
            });

            results.created++;
            fastify.log.info({ customerId: customer.id, codigoUnico }, 'Customer created from Excel');
          } catch (error: any) {
            results.errors.push({
              row: rowNumber,
              error: error.message || 'Error desconocido',
            });
            results.skipped++;
            fastify.log.error({ row: rowNumber, error: error.message }, 'Error processing row');
          }
        }

        return {
          success: true,
          total: rows.length,
          created: results.created,
          skipped: results.skipped,
          errors: results.errors,
        };
      } catch (error: any) {
        fastify.log.error({ error: error.message }, 'Error processing Excel file');
        return reply.status(500).send({
          error: 'Error al procesar el archivo Excel',
          details: error.message,
        });
      }
    }
  );
}
