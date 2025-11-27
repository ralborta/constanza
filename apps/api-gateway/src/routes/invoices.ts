import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import * as XLSX from 'xlsx';

const querySchema = z.object({
  state: z.enum(['ABIERTA', 'PARCIAL', 'SALDADA']).optional(),
  customer_id: z.string().uuid().optional(),
  fecha_vto_from: z.string().date().optional(),
  fecha_vto_to: z.string().date().optional(),
});

// Función para normalizar nombres de columnas de facturas
function normalizeInvoiceColumnName(key: string): string {
  const normalized = key.toLowerCase().trim();
  
  // Mapeo de variaciones comunes a nombres estándar
  // Código Cliente
  if (normalized.includes('codigo') && normalized.includes('cliente')) {
    return 'Código Cliente';
  }
  if (normalized === 'codigo' || normalized === 'código') {
    return 'Código Cliente';
  }
  // CUIT Cliente
  if (normalized.includes('cuit') && normalized.includes('cliente')) {
    return 'CUIT Cliente';
  }
  if (normalized === 'cuit') {
    return 'CUIT';
  }
  // Email Cliente
  if (normalized.includes('email') && normalized.includes('cliente')) {
    return 'Email Cliente';
  }
  if (normalized === 'email') {
    return 'Email';
  }
  // Número Factura
  if (normalized.includes('factura')) {
    if (normalized.includes('numero') || normalized.includes('número') || normalized.includes('nro')) {
      return 'Número Factura';
    }
  }
  if (normalized === 'nro' || normalized === 'nro.' || normalized === 'numero' || normalized === 'número') {
    return 'Número Factura';
  }
  // Monto
  if (normalized === 'monto' || normalized === 'importe') {
    return 'Monto';
  }
  // Fecha Vencimiento
  if (normalized.includes('fecha') && (normalized.includes('vencimiento') || normalized.includes('vto'))) {
    return 'Fecha Vencimiento';
  }
  if (normalized === 'vencimiento' || normalized === 'vto') {
    return 'Fecha Vencimiento';
  }
  // Estado
  if (normalized === 'estado') {
    return 'Estado';
  }
  
  return key; // Retornar original si no coincide
}

// Función para normalizar una fila de Excel de facturas
function normalizeInvoiceRow(row: any): any {
  const normalized: any = {};
  
  Object.keys(row).forEach((key) => {
    const normalizedKey = normalizeInvoiceColumnName(key);
    normalized[normalizedKey] = row[key];
  });
  
  return normalized;
}

export async function invoiceRoutes(fastify: FastifyInstance) {
  // GET /invoices - Lista facturas con filtros
  fastify.get(
    '/invoices',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const query = querySchema.parse(request.query);

      const where: any = {
        tenantId: user.tenant_id,
      };

      // Si es cliente, solo ve sus propias facturas
      if (user.perfil === 'CLIENTE' && user.customer_id) {
        where.customerId = user.customer_id;
      }

      if (query.state) {
        where.estado = query.state;
      }

      if (query.customer_id) {
        where.customerId = query.customer_id;
      }

      if (query.fecha_vto_from || query.fecha_vto_to) {
        where.fechaVto = {};
        if (query.fecha_vto_from) {
          where.fechaVto.gte = new Date(query.fecha_vto_from);
        }
        if (query.fecha_vto_to) {
          where.fechaVto.lte = new Date(query.fecha_vto_to);
        }
      }

      const invoices = await prisma.invoice.findMany({
        where,
        include: {
          customer: {
            include: {
              customerCuits: {
                where: { isPrimary: true },
                take: 1,
              },
            },
          },
          paymentApplications: {
            include: {
              payment: true,
            },
          },
        },
        orderBy: {
          fechaVto: 'asc',
        },
      });

      return {
        invoices: invoices.map((inv) => ({
          id: inv.id,
          customer: {
            id: inv.customer.id,
            razonSocial: inv.customer.razonSocial,
            cuit: inv.customer.customerCuits[0]?.cuit,
          },
          numero: inv.numero,
          monto: inv.monto,
          montoAplicado: inv.paymentApplications.reduce((sum, app) => sum + app.amount, 0),
          fechaVto: inv.fechaVto,
          estado: inv.estado,
          applications: inv.paymentApplications.map((app) => ({
            id: app.id,
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
            appliedAt: app.appliedAt,
          })),
        })),
      };
    }
  );

  // GET /invoices/:id - Detalle de factura con timeline
  fastify.get(
    '/invoices/:id',
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const where: any = {
        id,
        tenantId: user.tenant_id,
      };

      // Si es cliente, solo ve sus propias facturas
      if (user.perfil === 'CLIENTE' && user.customer_id) {
        where.customerId = user.customer_id;
      }

      const invoice = await prisma.invoice.findFirst({
        where,
        include: {
          customer: {
            include: {
              customerCuits: true,
            },
          },
          paymentApplications: {
            include: {
              payment: true,
            },
          },
          contactEvents: {
            orderBy: {
              ts: 'desc',
            },
            take: 50,
          },
          promises: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!invoice) {
        return reply.status(404).send({ error: 'Factura no encontrada' });
      }

      return {
        invoice: {
          id: invoice.id,
          customer: {
            id: invoice.customer.id,
            razonSocial: invoice.customer.razonSocial,
            cuits: invoice.customer.customerCuits,
          },
          numero: invoice.numero,
          monto: invoice.monto,
          montoAplicado: invoice.paymentApplications.reduce((sum, app) => sum + app.amount, 0),
          fechaVto: invoice.fechaVto,
          estado: invoice.estado,
          applications: invoice.paymentApplications.map((app) => ({
            id: app.id,
            amount: app.amount,
            isAuthoritative: app.isAuthoritative,
            appliedAt: app.appliedAt,
            payment: {
              id: app.payment.id,
              sourceSystem: app.payment.sourceSystem,
              method: app.payment.method,
              status: app.payment.status,
              settledAt: app.payment.settledAt,
            },
          })),
          timeline: [
            ...invoice.contactEvents.map((event) => ({
              type: 'CONTACT',
              channel: event.channel,
              direction: event.direction,
              message: event.messageText,
              status: event.status,
                  payload: event.payload,
              ts: event.ts,
            })),
            ...invoice.promises.map((promise) => ({
              type: 'PROMISE',
              amount: promise.amount,
              dueDate: promise.dueDate,
              channel: promise.channel,
              status: promise.status,
              ts: promise.createdAt,
            })),
            ...invoice.paymentApplications.map((app) => ({
              type: 'PAYMENT',
              amount: app.amount,
              isAuthoritative: app.isAuthoritative,
              sourceSystem: app.payment.sourceSystem,
              appliedAt: app.appliedAt,
              settledAt: app.payment.settledAt,
              ts: app.appliedAt,
            })),
          ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
        },
      };
    }
  );

  // POST /invoices/upload - Cargar facturas desde Excel
  fastify.post(
    '/invoices/upload',
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
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rows.length === 0) {
          return reply.status(400).send({ error: 'El archivo Excel está vacío' });
        }

        fastify.log.info({ rowsCount: rows.length }, 'Processing Excel file for invoices');

        const results = {
          created: 0,
          skipped: 0,
          errors: [] as Array<{ row: number; error: string }>,
        };

        // Procesar cada fila
        for (let i = 0; i < rows.length; i++) {
          const rawRow = rows[i];
          const rowNumber = i + 2; // +2 porque Excel empieza en 1 y la fila 1 es el header

          try {
            // Normalizar nombres de columnas
            const row = normalizeInvoiceRow(rawRow);

            // Validar campos requeridos
            // Puede venir como "Código Cliente", "Código Único Cliente", "CUIT", o "Email Cliente"
            const codigoCliente = row['Código Cliente'] || row['Código Único Cliente'];
            const cuitCliente = row['CUIT Cliente'] || row['CUIT'];
            const emailCliente = row['Email Cliente'] || row['Email'];
            
            if (!codigoCliente && !cuitCliente && !emailCliente) {
              results.errors.push({ row: rowNumber, error: 'Falta identificar al cliente (Código Cliente, CUIT o Email)' });
              results.skipped++;
              continue;
            }

            if (!row['Número Factura']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Número Factura" (también acepta: Nro. Factura, Numero, Número)' });
              results.skipped++;
              continue;
            }

            if (!row['Monto']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Monto" (también acepta: Importe)' });
              results.skipped++;
              continue;
            }

            if (!row['Fecha Vencimiento']) {
              results.errors.push({ row: rowNumber, error: 'Falta "Fecha Vencimiento" (también acepta: Vencimiento, Fecha Vto)' });
              results.skipped++;
              continue;
            }

            const numero = String(row['Número Factura']).trim();
            const montoStr = String(row['Monto']).replace(/[^\d.,]/g, '').replace(',', '.');
            const monto = Math.round(parseFloat(montoStr) * 100); // Convertir a centavos

            if (isNaN(monto) || monto <= 0) {
              results.errors.push({ row: rowNumber, error: 'Monto inválido' });
              results.skipped++;
              continue;
            }

            // Parsear fecha (puede venir en varios formatos)
            const fechaVtoStr = String(row['Fecha Vencimiento']).trim();
            let fechaVto: Date;
            
            // Intentar parsear la fecha
            if (fechaVtoStr.includes('/')) {
              const [day, month, year] = fechaVtoStr.split('/');
              fechaVto = new Date(`${year}-${month}-${day}`);
            } else if (fechaVtoStr.includes('-')) {
              fechaVto = new Date(fechaVtoStr);
            } else {
              // Si es un número de Excel (días desde 1900)
              const excelDate = parseFloat(fechaVtoStr);
              if (!isNaN(excelDate)) {
                fechaVto = new Date((excelDate - 25569) * 86400 * 1000);
              } else {
                fechaVto = new Date(fechaVtoStr);
              }
            }

            if (isNaN(fechaVto.getTime())) {
              results.errors.push({ row: rowNumber, error: 'Fecha de vencimiento inválida' });
              results.skipped++;
              continue;
            }

            // Buscar cliente
            let customer = null;
            if (codigoCliente) {
              customer = await prisma.customer.findFirst({
                where: {
                  tenantId: user.tenant_id,
                  codigoUnico: String(codigoCliente).trim(),
                },
              });
            }

            if (!customer && cuitCliente) {
              const customerCuit = await prisma.customerCuit.findFirst({
                where: {
                  tenantId: user.tenant_id,
                  cuit: String(cuitCliente).trim(),
                },
                include: {
                  customer: true,
                },
              });
              customer = customerCuit?.customer || null;
            }

            if (!customer && emailCliente) {
              customer = await prisma.customer.findFirst({
                where: {
                  tenantId: user.tenant_id,
                  email: String(emailCliente).trim().toLowerCase(),
                },
              });
            }

            if (!customer) {
              results.errors.push({
                row: rowNumber,
                error: `Cliente no encontrado (${codigoCliente || cuitCliente || emailCliente})`,
              });
              results.skipped++;
              continue;
            }

            // Verificar si la factura ya existe
            const existing = await prisma.invoice.findFirst({
              where: {
                tenantId: user.tenant_id,
                numero,
              },
            });

            if (existing) {
              results.errors.push({
                row: rowNumber,
                error: `Factura "${numero}" ya existe`,
              });
              results.skipped++;
              continue;
            }

            // Estado (opcional, por defecto ABIERTA)
            const estado = (row['Estado'] || 'ABIERTA').toUpperCase();
            const estadoValido = ['ABIERTA', 'PARCIAL', 'SALDADA'].includes(estado) ? estado : 'ABIERTA';

            // Crear factura
            const invoice = await prisma.invoice.create({
              data: {
                tenantId: user.tenant_id,
                customerId: customer.id,
                numero,
                monto,
                fechaVto,
                estado: estadoValido,
              },
            });

            results.created++;
            fastify.log.info({ invoiceId: invoice.id, numero }, 'Invoice created from Excel');
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

