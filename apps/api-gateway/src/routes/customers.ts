import { telefonoDigits } from '@constanza/phone-digits';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { withTenantRls } from '../lib/tenant-rls.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import * as XLSX from 'xlsx';

const createCustomerSchema = z
  .object({
    externalRef: z.string().max(200).optional(),
    /** CVU del cliente (alias semántico; se guarda en codigo_unico). */
    codigoUnico: z.string().optional(),
    cvu: z.string().optional(),
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
  })
  .refine((d) => Boolean((d.codigoUnico ?? d.cvu)?.trim()), {
    message: 'Indicá codigoUnico o cvu (CVU del cliente)',
    path: ['codigoUnico'],
  });

interface ExcelRow {
  [key: string]: any;
}

// Función para normalizar nombres de columnas
function normalizeColumnName(key: string): string {
  const normalized = key.toLowerCase().trim();

  // CVU del cliente (mismo campo que codigo_unico en DB; conciliación Cresium)
  if (normalized === 'cvu' || normalized === 'cvu cliente') {
    return 'Código Único';
  }
  
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

const OPEN_INVOICE_STATES = ['ABIERTA', 'VENCIDA', 'PARCIAL'];

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function safeOptionalQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error: any) {
    // P2021 = tabla no existe en el entorno (migración pendiente)
    if (error?.code === 'P2021') {
      return fallback;
    }
    throw error;
  }
}

export async function customerRoutes(fastify: FastifyInstance) {
  // Log para verificar que las rutas se registran
  fastify.log.info('Registering customer routes including /customers/upload');
  
  // GET /customers - Lista clientes
  fastify.get(
    '/customers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      try {
        // Importante: para este endpoint usamos filtro explícito por tenantId y evitamos
        // contexto de sesión RLS (set_config), que puede romperse detrás de poolers.
        const customers = await prisma.customer.findMany({
          where: {
            tenantId: user.tenant_id,
          },
          select: {
            id: true,
            codigoUnico: true,
            codigoVenta: true,
            externalRef: true,
            razonSocial: true,
            email: true,
            telefono: true,
            activo: true,
            accesoHabilitado: true,
          },
          orderBy: {
            razonSocial: 'asc',
          },
        });

        const customerIds = customers.map((c) => c.id);
        const cuitsRows =
          customerIds.length === 0
            ? []
            : await prisma.customerCuit.findMany({
                where: {
                  tenantId: user.tenant_id,
                  customerId: { in: customerIds },
                },
              });

        const cuitsByCustomer = new Map<string, typeof cuitsRows>();
        for (const row of cuitsRows) {
          const list = cuitsByCustomer.get(row.customerId) ?? [];
          list.push(row);
          cuitsByCustomer.set(row.customerId, list);
        }

        return {
          customers: customers.map((c) => ({
            id: c.id,
            codigoUnico: c.codigoUnico,
            codigoVenta: c.codigoVenta,
            externalRef: c.externalRef,
            razonSocial: c.razonSocial,
            email: c.email,
            telefono: c.telefono,
            activo: c.activo,
            accesoHabilitado: c.accesoHabilitado,
            cuits: cuitsByCustomer.get(c.id) ?? [],
          })),
        };
      } catch (error: any) {
        fastify.log.error(
          {
            path: '/v1/customers',
            tenantId: user.tenant_id,
            code: error?.code,
            message: error?.message,
            meta: error?.meta,
          },
          'Error listando clientes'
        );
        return reply.status(500).send({
          error: 'Error obteniendo clientes',
          code: error?.code ?? null,
          detail: error?.message ?? null,
        });
      }
    }
  );

  // GET /customers/:id/historial - Historia clínica 360° del cliente
  fastify.get(
    '/customers/:id/historial',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const customer = await prisma.customer.findFirst({
        where: {
          id,
          tenantId: user.tenant_id,
        },
        include: {
          customerCuits: {
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      });

      if (!customer) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }

      const [invoices, contactEvents, echeqs, callbacks] = await Promise.all([
        prisma.invoice.findMany({
          where: {
            tenantId: user.tenant_id,
            customerId: customer.id,
          },
          include: {
            paymentApplications: {
              include: {
                payment: true,
              },
            },
            promises: true,
          },
          orderBy: [{ fechaVto: 'asc' }, { createdAt: 'desc' }],
        }),
        prisma.contactEvent.findMany({
          where: {
            tenantId: user.tenant_id,
            customerId: customer.id,
          },
          include: {
            invoice: {
              select: {
                id: true,
                numero: true,
              },
            },
          },
          orderBy: { ts: 'desc' },
          take: 150,
        }),
        safeOptionalQuery(
          () =>
            prisma.echeq.findMany({
              where: {
                tenantId: user.tenant_id,
                customerId: customer.id,
              },
              orderBy: { createdAt: 'desc' },
              take: 50,
            }),
          []
        ),
        safeOptionalQuery(
          () =>
            prisma.scheduledCallback.findMany({
              where: {
                tenantId: user.tenant_id,
                customerId: customer.id,
              },
              include: {
                invoice: {
                  select: {
                    id: true,
                    numero: true,
                  },
                },
              },
              orderBy: { scheduledAt: 'desc' },
              take: 50,
            }),
          []
        ),
      ]);

      const invoicePayload = invoices.map((invoice) => {
        const montoAplicado = invoice.paymentApplications.reduce((sum, app) => sum + app.amount, 0);
        const saldo = Math.max(invoice.monto - montoAplicado, 0);
        return {
          id: invoice.id,
          numero: invoice.numero,
          externalRef: invoice.externalRef,
          monto: invoice.monto,
          montoAplicado,
          saldo,
          fechaVto: invoice.fechaVto,
          estado: invoice.estado,
          promises: invoice.promises.map((promise) => ({
            id: promise.id,
            amount: promise.amount,
            dueDate: promise.dueDate,
            channel: promise.channel,
            status: promise.status,
            reason: promise.reason,
            createdAt: promise.createdAt,
          })),
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
              externalRef: app.payment.externalRef,
            },
          })),
        };
      });

      const totalFacturado = invoices.reduce((sum, invoice) => sum + invoice.monto, 0);
      const totalAplicado = invoices.reduce(
        (sum, invoice) => sum + invoice.paymentApplications.reduce((appSum, app) => appSum + app.amount, 0),
        0
      );
      const saldoPendiente = invoicePayload
        .filter((invoice) => OPEN_INVOICE_STATES.includes(invoice.estado))
        .reduce((sum, invoice) => sum + invoice.saldo, 0);
      const facturasVencidas = invoicePayload.filter(
        (invoice) => invoice.estado === 'VENCIDA' || (invoice.saldo > 0 && new Date(invoice.fechaVto) < new Date())
      ).length;
      const allPromises = invoicePayload.flatMap((invoice) => invoice.promises);
      const fulfilledPromises = allPromises.filter((promise) =>
        ['CUMPLIDA', 'FULFILLED', 'DONE', 'PAGADA'].includes(promise.status)
      ).length;
      const brokenPromises = allPromises.filter((promise) =>
        ['ROTA', 'BROKEN', 'INCUMPLIDA', 'VENCIDA'].includes(promise.status)
      ).length;
      const lastContact = contactEvents[0] ?? null;
      const lastPaymentApplication = invoices
        .flatMap((invoice) => invoice.paymentApplications)
        .sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime())[0];

      const timeline = [
        ...contactEvents.map((event) => ({
          type: 'CONTACT',
          id: event.id,
          ts: event.ts,
          invoiceId: event.invoiceId,
          invoiceNumero: event.invoice?.numero ?? null,
          channel: event.channel,
          direction: event.direction,
          status: event.status,
          title: `${event.channel} ${event.direction}`,
          message: event.callSummary || event.messageText || event.transcription || event.errorReason,
          metadata: {
            callDuration: event.callDuration,
            mediaUrl: event.mediaUrl,
          },
        })),
        ...invoicePayload.flatMap((invoice) =>
          invoice.promises.map((promise) => ({
            type: 'PROMISE',
            id: promise.id,
            ts: promise.createdAt,
            invoiceId: invoice.id,
            invoiceNumero: invoice.numero,
            channel: promise.channel,
            status: promise.status,
            title: 'Promesa de pago',
            message: promise.reason,
            amount: promise.amount,
            dueDate: promise.dueDate,
          }))
        ),
        ...invoicePayload.flatMap((invoice) =>
          invoice.applications.map((app) => ({
            type: 'PAYMENT',
            id: app.id,
            ts: app.appliedAt,
            invoiceId: invoice.id,
            invoiceNumero: invoice.numero,
            status: app.payment.status,
            title: 'Pago aplicado',
            message: `${app.payment.method} desde ${app.payment.sourceSystem}`,
            amount: app.amount,
            sourceSystem: app.payment.sourceSystem,
            settledAt: app.payment.settledAt,
          }))
        ),
        ...echeqs.map((echeq) => ({
          type: 'ECHEQ',
          id: echeq.id,
          ts: echeq.createdAt,
          invoiceId: null,
          invoiceNumero: null,
          status: echeq.statusLiquidacion,
          title: `E-cheque ${echeq.number}`,
          message: `Operativo: ${echeq.statusOperativo}`,
          amount: echeq.amount,
          settledAt: echeq.settledAt,
        })),
        ...callbacks.map((callback) => ({
          type: 'CALLBACK',
          id: callback.id,
          ts: callback.scheduledAt,
          invoiceId: callback.invoiceId,
          invoiceNumero: callback.invoice?.numero ?? null,
          status: callback.status,
          title: callback.type,
          message: callback.reason,
        })),
      ].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

      return {
        customer: {
          id: customer.id,
          codigoUnico: customer.codigoUnico,
          codigoVenta: customer.codigoVenta,
          externalRef: customer.externalRef,
          razonSocial: customer.razonSocial,
          email: customer.email,
          telefono: customer.telefono,
          activo: customer.activo,
          accesoHabilitado: customer.accesoHabilitado,
          cuits: customer.customerCuits,
        },
        metrics: {
          totalFacturado,
          totalAplicado,
          saldoPendiente,
          facturasTotal: invoices.length,
          facturasAbiertas: invoicePayload.filter((invoice) => OPEN_INVOICE_STATES.includes(invoice.estado)).length,
          facturasVencidas,
          contactosTotal: contactEvents.length,
          promesasTotal: allPromises.length,
          promesasCumplidas: fulfilledPromises,
          promesasRotas: brokenPromises,
          callbacksPendientes: callbacks.filter((callback) => callback.status === 'PENDING').length,
          echeqsTotal: echeqs.length,
          ultimoContactoAt: toIso(lastContact?.ts),
          ultimoPagoAt: toIso(lastPaymentApplication?.appliedAt),
          criticidad:
            facturasVencidas >= 3 || saldoPendiente >= 50000000 || brokenPromises >= 2
              ? 'ALTA'
              : facturasVencidas > 0 || saldoPendiente > 0
                ? 'MEDIA'
                : 'BAJA',
        },
        invoices: invoicePayload,
        echeqs,
        callbacks,
        timeline,
      };
    }
  );

  // POST /customers - Alta manual (formulario / integraciones)
  fastify.post(
    '/customers',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = createCustomerSchema.parse(request.body);
      const codigoCliente = (body.codigoUnico ?? body.cvu)!.trim();

      return withTenantRls(user, async (tx) => {
        if (body.externalRef?.trim()) {
          const clash = await tx.customer.findFirst({
            where: {
              tenantId: user.tenant_id,
              externalRef: body.externalRef.trim(),
            },
          });
          if (clash) {
            return reply.status(409).send({ error: 'Ya existe un cliente con ese externalRef (ERP)' });
          }
        }

        const existing = await tx.customer.findFirst({
          where: {
            tenantId: user.tenant_id,
            OR: [{ codigoUnico: codigoCliente }, { email: body.email.trim().toLowerCase() }],
          },
        });
        if (existing) {
          return reply.status(409).send({ error: 'Ya existe un cliente con ese CVU o email' });
        }

        const normalizeCuit = (raw: string) => raw.replace(/\D/g, '') || raw;

        const customer = await tx.customer.create({
          data: {
            tenantId: user.tenant_id,
            externalRef: body.externalRef?.trim() || null,
            codigoUnico: codigoCliente,
            codigoVenta: body.codigoVenta || '000',
            razonSocial: body.razonSocial.trim(),
            email: body.email.trim().toLowerCase(),
            telefono: body.telefono?.trim(),
            telefonoNormalizado: telefonoDigits(body.telefono?.trim()),
            customerCuits:
              body.cuits?.length ?
                {
                  create: body.cuits.map((cu) => ({
                    tenantId: user.tenant_id,
                    cuit: normalizeCuit(cu.cuit.trim()),
                    razonSocial: cu.razonSocial?.trim(),
                    isPrimary: cu.isPrimary,
                  })),
                }
              : undefined,
          },
          include: { customerCuits: true },
        });

        return {
          customer: {
            id: customer.id,
            externalRef: customer.externalRef,
            codigoUnico: customer.codigoUnico,
            codigoVenta: customer.codigoVenta,
            razonSocial: customer.razonSocial,
            email: customer.email,
            telefono: customer.telefono,
            cuits: customer.customerCuits,
          },
        };
      });
    }
  );

  // POST /customers/upload - Cargar clientes desde Excel
  // IMPORTANTE: Esta ruta debe estar ANTES de POST /customers para que Fastify la reconozca correctamente
  fastify.post(
    '/customers/upload',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      fastify.log.info('POST /customers/upload endpoint called');
      const user = request.user!;
      
      // Test de conexión a la DB
      try {
        await prisma.$queryRaw`SELECT 1`;
        fastify.log.info('Database connection OK');
      } catch (dbError: any) {
        fastify.log.error({ error: dbError.message, stack: dbError.stack }, 'Database connection failed');
        return reply.status(500).send({
          error: 'Error de conexión a la base de datos',
          details: dbError.message || 'No se pudo conectar a la base de datos. Verifica que DATABASE_URL esté configurada y que las migraciones se hayan ejecutado.',
        });
      }
      
      // Inicializar variables fuera del try para que estén disponibles en el catch
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };
      let rows: ExcelRow[] = [];

      try {
        fastify.log.info('Starting file upload processing');
        const data = await request.file();

        if (!data) {
          fastify.log.warn('No file received in request');
          return reply.status(400).send({ error: 'No se envió ningún archivo' });
        }
        
        fastify.log.info({ filename: data.filename, mimetype: data.mimetype }, 'File received');

        // Verificar que sea un archivo Excel
        const filename = data.filename.toLowerCase();
        if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
          return reply.status(400).send({ error: 'El archivo debe ser Excel (.xlsx o .xls)' });
        }

        // Leer el archivo
        fastify.log.info('Reading Excel file...');
        const buffer = await data.toBuffer();
        fastify.log.info({ bufferSize: buffer.length }, 'Buffer read, parsing Excel...');
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        rows = XLSX.utils.sheet_to_json(worksheet);
        fastify.log.info({ rowsCount: rows.length, sheetName }, 'Excel parsed successfully');

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
            fastify.log.info({ codigoUnico, email }, 'Attempting to create customer in database');
            const customer = await prisma.customer.create({
              data: {
                tenantId: user.tenant_id,
                codigoUnico,
                codigoVenta,
                razonSocial,
                email,
                telefono,
                telefonoNormalizado: telefonoDigits(telefono),
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
        if (results.errors.length > 0 && rows.length > 0) {
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
