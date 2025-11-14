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
  [key: string]: any;
}

// Función para normalizar nombres de columnas
function normalizeColumnName(key: string): string {
  const normalized = key.toLowerCase().trim();
  
  // Mapeo de variaciones comunes a nombres estándar
  // Primero verificar "Código Venta" antes de "Código Único" para evitar conflictos
  if (normalized.includes('codigo') && (normalized.includes('venta') || normalized.includes('ventas'))) {
    return 'Código Venta';
  }
  // Luego verificar "Código Único" o solo "Codigo" (si no es venta)
  if (normalized.includes('codigo') && (normalized.includes('unico') || normalized.includes('único'))) {
    return 'Código Único';
  }
  // Si solo dice "codigo" sin más contexto, asumimos que es "Código Único"
  if (normalized === 'codigo' || normalized === 'código') {
    return 'Código Único';
  }
  if (normalized.includes('razon') && normalized.includes('social')) {
    return 'Razón Social';
  }
  if (normalized.includes('nombre') || normalized.includes('nombrte')) {
    return 'Razón Social';
  }
  if (normalized === 'email') {
    return 'Email';
  }
  if (normalized.includes('telefono') || normalized.includes('teléfono')) {
    return 'Teléfono';
  }
  if (normalized === 'cuit') {
    return 'CUIT';
  }
  
  return key; // Retornar original si no coincide
}

// Función para normalizar una fila de Excel
function normalizeExcelRow(row: ExcelRow): ExcelRow {
  const normalized: ExcelRow = {};
  
  Object.keys(row).forEach((key) => {
    const normalizedKey = normalizeColumnName(key);
    normalized[normalizedKey] = row[key];
  });
  
  return normalized;
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
      
      // Inicializar results fuera del try para que esté disponible en el catch
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };

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

        // Log de las columnas detectadas para debugging
        if (rows.length > 0) {
          const firstRowKeys = Object.keys(rows[0]);
          fastify.log.info({ 
            rowsCount: rows.length, 
            columns: firstRowKeys,
            firstRowSample: rows[0]
          }, 'Processing Excel file');
        }

        // Procesar cada fila
        for (let i = 0; i < rows.length; i++) {
          const rawRow = rows[i];
          const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la fila 1 es el header

          try {
            // Normalizar nombres de columnas
            const row = normalizeExcelRow(rawRow);
            
            // Log para debugging
            fastify.log.debug({ 
              rowNumber, 
              rawKeys: Object.keys(rawRow),
              normalizedKeys: Object.keys(row),
              normalizedRow: row
            }, 'Processing row');

            // Validar campos requeridos
            if (!row['Código Único']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Código Único" (también acepta: Codigo, Codigo Unico)' });
              results.skipped++;
              continue;
            }

            if (!row['Razón Social']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Razón Social" (también acepta: Nombre, Nombrte, Razon Social)' });
              results.skipped++;
              continue;
            }

            if (!row['Email']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Email" (también acepta: email)' });
              results.skipped++;
              continue;
            }

            // Validar email
            const emailValue = String(row['Email']!).trim();
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailValue)) {
              results.errors.push({ 
                row: rowNumber, 
                error: `Email inválido: "${emailValue}". El email debe tener formato válido (ej: usuario@dominio.com)` 
              });
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
            const errorMsg = error.message || error.toString() || 'Error desconocido';
            results.errors.push({
              row: rowNumber,
              error: errorMsg,
            });
            results.skipped++;
            fastify.log.error({ 
              row: rowNumber, 
              error: errorMsg,
              stack: error.stack,
              errorName: error.name 
            }, 'Error processing row');
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
        fastify.log.error({ 
          error: error.message, 
          stack: error.stack,
          name: error.name 
        }, 'Error processing Excel file');
        
        // Si hay errores en las filas, devolverlos
        if (results.errors.length > 0) {
          return {
            success: false,
            total: rows.length,
            created: results.created,
            skipped: results.skipped,
            errors: results.errors,
          };
        }
        
        return reply.status(500).send({
          error: 'Error al procesar el archivo Excel',
          details: error.message || 'Error desconocido',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
      }
    }
  );
}
