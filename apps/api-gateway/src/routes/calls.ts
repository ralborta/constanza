import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { getNotifierBaseUrl } from '../lib/config.js';
import { processCallSummaryForCallbacks } from '../services/callbacks-from-summary.js';

// Configuración de ElevenLabs
const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;
const OPEN_INVOICE_STATES = ['ABIERTA', 'VENCIDA', 'PARCIAL'];
const POST_CALL_WHATSAPP_ENABLED = process.env.POST_CALL_WHATSAPP_ENABLED !== 'false';

/**
 * Formatea número de teléfono para ElevenLabs (formato E.164)
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('54')) {
      cleaned = '+' + cleaned;
    } else {
      cleaned = '+54' + cleaned;
    }
  }
  return cleaned;
}

function formatMoneyCents(value: number | null | undefined): string {
  const cents = Number(value || 0);
  return (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  });
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function stringifyDynamicVariables(variables: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)])
  );
}

async function buildVoiceContextVariables(input: {
  tenantId: string;
  customerId: string;
  invoiceId?: string | null;
  baseVariables?: Record<string, string>;
}) {
  const customer = await prisma.customer.findFirst({
    where: {
      id: input.customerId,
      tenantId: input.tenantId,
      activo: true,
    },
    include: {
      customerCuits: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  if (!customer) {
    return input.baseVariables || {};
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      customerId: customer.id,
      tenantId: input.tenantId,
      estado: { in: OPEN_INVOICE_STATES },
    },
    include: {
      paymentApplications: true,
    },
    orderBy: [{ fechaVto: 'asc' }, { createdAt: 'desc' }],
    take: 20,
  });

  const targetInvoice =
    (input.invoiceId ? invoices.find((invoice) => invoice.id === input.invoiceId) : null) || invoices[0] || null;

  const enrichedInvoices = invoices.map((invoice) => {
    const applied = invoice.paymentApplications.reduce((sum, application) => sum + application.amount, 0);
    const balance = Math.max(invoice.monto - applied, 0);
    return {
      id: invoice.id,
      numero: invoice.numero,
      monto: invoice.monto,
      applied,
      balance,
      fechaVto: invoice.fechaVto,
      estado: invoice.estado,
    };
  });

  const targetInvoiceData = targetInvoice ? enrichedInvoices.find((invoice) => invoice.id === targetInvoice.id) : null;
  const totalOpenBalance = enrichedInvoices.reduce((sum, invoice) => sum + invoice.balance, 0);
  const openInvoicesSummary = enrichedInvoices
    .slice(0, 8)
    .map(
      (invoice) =>
        `Factura ${invoice.numero}: saldo ${formatMoneyCents(invoice.balance)}, vence ${formatDate(invoice.fechaVto)}, estado ${invoice.estado}`
    )
    .join('; ');

  return stringifyDynamicVariables({
    ...(input.baseVariables || {}),
    customer_id: customer.id,
    customer_name: customer.razonSocial,
    customer_code: customer.codigoUnico,
    customer_email: customer.email,
    customer_phone: customer.telefono || '',
    customer_cuit: customer.customerCuits[0]?.cuit || '',
    invoice_id: targetInvoiceData?.id || input.invoiceId || '',
    invoice_number: targetInvoiceData?.numero || '',
    invoice_amount: targetInvoiceData ? formatMoneyCents(targetInvoiceData.monto) : '',
    invoice_balance: targetInvoiceData ? formatMoneyCents(targetInvoiceData.balance) : '',
    invoice_due_date: targetInvoiceData ? formatDate(targetInvoiceData.fechaVto) : '',
    invoice_status: targetInvoiceData?.estado || '',
    open_invoices_count: enrichedInvoices.length,
    total_open_balance: formatMoneyCents(totalOpenBalance),
    open_invoices_summary: openInvoicesSummary || 'No registra facturas abiertas.',
    agent_context_summary:
      enrichedInvoices.length > 0
        ? `Cliente ${customer.razonSocial}. Total pendiente ${formatMoneyCents(totalOpenBalance)}. ${openInvoicesSummary}`
        : `Cliente ${customer.razonSocial}. No registra facturas abiertas.`,
    post_call_whatsapp_policy:
      'Si el cliente pide detalle de facturas, saldos o vencimientos adicionales, indicá que se enviará el detalle por WhatsApp al finalizar la llamada.',
    post_call_whatsapp_allowed: 'true',
  });
}

function extractDynamicVariables(body: any): Record<string, string> {
  const candidates = [
    body?.conversation_initiation_client_data?.dynamic_variables,
    body?.conversation_initiation_client_data?.conversation_initiation_client_data?.dynamic_variables,
    body?.metadata?.dynamic_variables,
  ];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object') {
      return candidate;
    }
  }

  return {};
}

function shouldSendPostCallWhatsApp(input: {
  summary?: string | null;
  transcript?: string | null;
  variables: Record<string, string>;
}) {
  if (!POST_CALL_WHATSAPP_ENABLED) return false;
  if (input.variables.post_call_whatsapp_allowed === 'false') return false;
  if (input.variables.send_post_call_whatsapp === 'true' || input.variables.post_call_whatsapp_requested === 'true') {
    return true;
  }

  const text = `${input.summary || ''}\n${input.transcript || ''}`.toLowerCase();
  const mentionsWhatsapp = /\b(whatsapp|wsp|mensaje)\b/.test(text);
  const asksForBillingInfo = /(factura|facturas|saldo|saldos|vencimiento|vencimientos|detalle|deuda|informaci[oó]n)/.test(
    text
  );
  const sendIntent = /(enviar|mandar|pasar|compartir|recibir|solicit[oó]|pid[ií]o|pide)/.test(text);

  return mentionsWhatsapp && asksForBillingInfo && sendIntent;
}

async function buildPostCallWhatsAppMessage(input: {
  tenantId: string;
  customerId: string;
  invoiceId?: string | null;
}) {
  const variables = await buildVoiceContextVariables(input);
  const customerName = variables.customer_name || 'cliente';
  const total = variables.total_open_balance || '$0';
  const invoicesSummary = variables.open_invoices_summary || 'No registramos facturas abiertas.';

  return [
    `Hola ${customerName}, tal como conversamos con Constanza, te enviamos el detalle actualizado de tu cuenta.`,
    '',
    `Total pendiente: ${total}.`,
    invoicesSummary,
    '',
    'Si ya realizaste el pago, podés responder este mensaje con el comprobante para imputarlo.',
  ].join('\n');
}

const callRowSchema = z.object({
  customer_codigo_unico: z.string().optional(),
  customer_cuit: z.string().optional(),
  telefono: z.string().optional(),
  script: z.string(),
  variables: z.string().optional(), // JSON string
  invoice_numero: z.string().optional(),
  invoice_id: z.string().uuid().optional(),
});

export async function callRoutes(fastify: FastifyInstance) {
  // POST /calls/upload - Cargar batch de llamadas desde Excel
  fastify.post(
    '/calls/upload',
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

        const buffer = await data.toBuffer();
        const fileExtension = data.filename?.split('.').pop()?.toLowerCase();

        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
          return reply.status(400).send({ error: 'El archivo debe ser Excel (.xlsx o .xls)' });
        }

        // Leer Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (rows.length === 0) {
          return reply.status(400).send({ error: 'El archivo Excel está vacío' });
        }

        // Validar y procesar filas
        const validRows: any[] = [];
        const errors: Array<{ row: number; error: string }> = [];

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i] as any;
          const rowNum = i + 2; // +2 porque empieza en 0 y la fila 1 es el header

          try {
            // Normalizar nombres de columnas (case insensitive, sin espacios)
            const normalizedRow: any = {};
            Object.keys(row).forEach((key) => {
              const normalized = key.toLowerCase().trim().replace(/\s+/g, '_');
              normalizedRow[normalized] = row[key];
            });

            // Validar con zod
            const validated = callRowSchema.parse(normalizedRow);

            // Debe tener al menos customer_codigo_unico o customer_cuit
            if (!validated.customer_codigo_unico && !validated.customer_cuit) {
              errors.push({ row: rowNum, error: 'Debe tener customer_codigo_unico o customer_cuit' });
              continue;
            }

            validRows.push({
              ...validated,
              rowNum,
            });
          } catch (error: any) {
            if (error instanceof z.ZodError) {
              errors.push({
                row: rowNum,
                error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
              });
            } else {
              errors.push({ row: rowNum, error: error.message || 'Error desconocido' });
            }
          }
        }

        if (validRows.length === 0) {
          return reply.status(400).send({
            error: 'No se encontraron filas válidas',
            errors,
          });
        }

        // Buscar clientes y facturas
        const processedRows: any[] = [];
        const notFoundErrors: Array<{ row: number; error: string }> = [];

        for (const row of validRows) {
          try {
            // Buscar cliente
            let customer;
            if (row.customer_codigo_unico) {
              customer = await prisma.customer.findFirst({
                where: {
                  codigoUnico: row.customer_codigo_unico,
                  tenantId: user.tenant_id,
                  activo: true,
                },
              });
            } else if (row.customer_cuit) {
              // Buscar por CUIT en customer_cuits
              const customerCuit = await prisma.customerCuit.findFirst({
                where: {
                  cuit: row.customer_cuit,
                  customer: {
                    tenantId: user.tenant_id,
                    activo: true,
                  },
                },
                include: { customer: true },
              });
              customer = customerCuit?.customer;
            }

            if (!customer) {
              notFoundErrors.push({
                row: row.rowNum,
                error: `Cliente no encontrado: ${row.customer_codigo_unico || row.customer_cuit}`,
              });
              continue;
            }

            // Validar teléfono
            const telefono = row.telefono || customer.telefono;
            if (!telefono) {
              notFoundErrors.push({
                row: row.rowNum,
                error: `Cliente ${customer.razonSocial} no tiene teléfono configurado`,
              });
              continue;
            }

            // Buscar factura si se especificó
            let invoiceId = row.invoice_id || null;
            if (row.invoice_numero && !invoiceId) {
              const invoice = await prisma.invoice.findFirst({
                where: {
                  numero: row.invoice_numero,
                  customerId: customer.id,
                  tenantId: user.tenant_id,
                },
              });
              invoiceId = invoice?.id || null;
            }

            // Parsear variables si existen
            let variables: Record<string, string> = {};
            if (row.variables) {
              try {
                variables = JSON.parse(row.variables);
              } catch {
                // Ignorar si no es JSON válido
              }
            }

            processedRows.push({
              customerId: customer.id,
              invoiceId,
              telefono,
              script: row.script,
              variables,
            });
          } catch (error: any) {
            notFoundErrors.push({
              row: row.rowNum,
              error: error.message || 'Error al procesar fila',
            });
          }
        }

        if (processedRows.length === 0) {
          return reply.status(400).send({
            error: 'No se pudieron procesar filas válidas',
            errors: [...errors, ...notFoundErrors],
          });
        }

        // Crear batch job
        const batchJob = await prisma.batchJob.create({
          data: {
            tenantId: user.tenant_id,
            createdBy: user.user_id || '',
            channel: 'VOICE',
            status: 'PENDING',
            totalMessages: processedRows.length,
            processed: 0,
            failed: 0,
            fileName: data.filename,
            fileFormat: 'XLSX',
          },
        });

        // Guardar los datos del batch para ejecución posterior
        // Usaremos un campo JSON en errorSummary temporalmente para almacenar los datos
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: {
            errorSummary: {
              rows: processedRows,
              errors: [...errors, ...notFoundErrors],
            } as any,
          },
        });

        return {
          batchId: batchJob.id,
          totalRows: rows.length,
          validRows: validRows.length,
          processedRows: processedRows.length,
          errors: errors.length + notFoundErrors.length,
          errorDetails: [...errors, ...notFoundErrors],
          status: 'PENDING',
        };
      } catch (error: any) {
        fastify.log.error({ error: error.message }, 'Error uploading calls batch');
        return reply.status(500).send({ error: 'Error al procesar archivo Excel' });
      }
    }
  );

  // POST /calls/batch/:id/execute - Ejecutar un batch de llamadas
  fastify.post(
    '/calls/batch/:id/execute',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      try {
        const NOTIFIER_URL = getNotifierBaseUrl();
        fastify.log.info({ NOTIFIER_URL }, '[calls.execute] Using NOTIFIER_URL');
        const batchJob = await prisma.batchJob.findFirst({
          where: {
            id,
            tenantId: user.tenant_id,
            channel: 'VOICE',
          },
        });

        if (!batchJob) {
          return reply.status(404).send({ error: 'Batch no encontrado' });
        }

        if (batchJob.status !== 'PENDING') {
          return reply.status(400).send({
            error: `El batch ya está ${batchJob.status}. Solo se pueden ejecutar batches en estado PENDING`,
          });
        }

        // Obtener datos del batch
        const batchData = batchJob.errorSummary as any;
        if (!batchData || !batchData.rows) {
          return reply.status(400).send({ error: 'El batch no tiene datos para ejecutar' });
        }

        // Validar configuración de ElevenLabs
        if (!ELEVENLABS_API_KEY || !ELEVENLABS_AGENT_ID || !ELEVENLABS_PHONE_NUMBER_ID) {
          return reply.status(500).send({
            error: 'Configuración de ElevenLabs incompleta. Verifique las variables de entorno.',
          });
        }

        // Actualizar estado a PROCESSING
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: {
            status: 'PROCESSING',
            startedAt: new Date(),
          },
        });

        // Crear registros antes de llamar a ElevenLabs para poder correlacionar el webhook de cierre.
        const preparedRows = [];
        for (const row of batchData.rows) {
          const dynamicVariables = await buildVoiceContextVariables({
            tenantId: user.tenant_id,
            customerId: row.customerId,
            invoiceId: row.invoiceId || null,
            baseVariables: row.variables || {},
          });

          const contactEvent = await prisma.contactEvent.create({
            data: {
              tenantId: user.tenant_id,
              batchId: batchJob.id,
              customerId: row.customerId,
              invoiceId: row.invoiceId || null,
              channel: 'VOICE',
              direction: 'OUTBOUND',
              isManual: false,
              messageText: row.script,
              status: 'PENDING',
              externalMessageId: null,
              payload: {
                dynamicVariables,
                postCallWhatsApp: { enabled: POST_CALL_WHATSAPP_ENABLED, sent: false },
              } as any,
              ts: new Date(),
            },
          });

          preparedRows.push({
            ...row,
            contactEventId: contactEvent.id,
            dynamicVariables: {
              ...dynamicVariables,
              contact_event_id: contactEvent.id,
              batch_id: batchJob.id,
            },
          });
        }

        // Preparar contactos para ElevenLabs Batch Calling
        const recipients = preparedRows.map((row: any) => ({
          phone_number: formatPhoneNumber(row.telefono),
          conversation_initiation_client_data: {
            type: 'conversation_initiation_client_data',
            dynamic_variables: row.dynamicVariables,
          },
        }));

        // Ejecutar batch con ElevenLabs
        const requestBody = {
          call_name: batchJob.fileName || `Batch ${batchJob.id}`,
          agent_id: ELEVENLABS_AGENT_ID,
          agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
          scheduled_time_unix: Math.floor(Date.now() / 1000),
          recipients,
        };

        fastify.log.info(
          { batchId: batchJob.id, recipientsCount: recipients.length },
          'Ejecutando batch con ElevenLabs'
        );

        const elevenLabsResponse = await axios.post(
          `${ELEVENLABS_API_URL}/v1/convai/batch-calling/submit`,
          requestBody,
          {
            headers: {
              'xi-api-key': ELEVENLABS_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        const elevenLabsBatchId = elevenLabsResponse.data.batch_id || elevenLabsResponse.data.id;

        // Guardar el ID del batch de ElevenLabs en errorSummary para referencia futura
        await prisma.batchJob.update({
          where: { id: batchJob.id },
          data: {
            errorSummary: {
              ...batchData,
              elevenLabsBatchId,
            } as any,
          },
        });

        fastify.log.info(
          { batchId: batchJob.id, elevenLabsBatchId, totalCalls: recipients.length },
          'Batch ejecutado exitosamente con ElevenLabs'
        );

        return {
          batchId: batchJob.id,
          elevenLabsBatchId,
          totalCalls: recipients.length,
          status: 'PROCESSING',
        };
      } catch (error: any) {
        fastify.log.error({ error: error.message }, 'Error executing call batch');
        return reply.status(500).send({ error: 'Error al ejecutar batch de llamadas' });
      }
    }
  );

  // GET /calls/batches - Listar batches de llamadas
  fastify.get(
    '/calls/batches',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { status, limit = '50', offset = '0' } = request.query as {
        status?: string;
        limit?: string;
        offset?: string;
      };

      const where: any = {
        tenantId: user.tenant_id,
        channel: 'VOICE',
      };

      if (status) {
        where.status = status;
      }

      const batches = await prisma.batchJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          user: {
            select: {
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      });

      const total = await prisma.batchJob.count({ where });

      return {
        batches: batches.map((b) => ({
          id: b.id,
          status: b.status,
          totalMessages: b.totalMessages,
          processed: b.processed,
          failed: b.failed,
          fileName: b.fileName,
          createdAt: b.createdAt,
          startedAt: b.startedAt,
          completedAt: b.completedAt,
          createdBy: b.user
            ? {
                nombre: b.user.nombre,
                apellido: b.user.apellido,
                email: b.user.email,
              }
            : null,
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    }
  );

  // GET /calls - Listar llamadas individuales (desde contact.events)
  fastify.get(
    '/calls',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { batchId, customerId, status, limit = '50', offset = '0' } = request.query as {
        batchId?: string;
        customerId?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const where: any = {
        tenantId: user.tenant_id,
        channel: 'VOICE',
      };

      if (batchId) {
        where.batchId = batchId;
      }

      if (customerId) {
        where.customerId = customerId;
      }

      if (status) {
        where.status = status;
      }

      const calls = await prisma.contactEvent.findMany({
        where,
        orderBy: { ts: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          customer: {
            select: {
              razonSocial: true,
              codigoUnico: true,
              telefono: true,
            },
          },
          invoice: {
            select: {
              numero: true,
              monto: true,
            },
          },
        },
      });

      const total = await prisma.contactEvent.count({ where });

      return {
        calls: calls.map((c) => ({
          id: c.id,
          customerId: c.customerId,
          customer: c.customer
            ? {
                razonSocial: c.customer.razonSocial,
                codigoUnico: c.customer.codigoUnico,
                telefono: c.customer.telefono,
              }
            : null,
          invoice: c.invoice
            ? {
                numero: c.invoice.numero,
                monto: c.invoice.monto,
              }
            : null,
          status: c.status,
          messageText: c.messageText,
          externalMessageId: c.externalMessageId,
          errorReason: c.errorReason,
          ts: c.ts,
          batchId: c.batchId,
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    }
  );

  // GET /calls/batch/:id - Detalle de un batch
  fastify.get(
    '/calls/batch/:id',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const batchJob = await prisma.batchJob.findFirst({
        where: {
          id,
          tenantId: user.tenant_id,
          channel: 'VOICE',
        },
        include: {
          user: {
            select: {
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      });

      if (!batchJob) {
        return reply.status(404).send({ error: 'Batch no encontrado' });
      }

      return {
        batch: {
          id: batchJob.id,
          status: batchJob.status,
          totalMessages: batchJob.totalMessages,
          processed: batchJob.processed,
          failed: batchJob.failed,
          fileName: batchJob.fileName,
          createdAt: batchJob.createdAt,
          startedAt: batchJob.startedAt,
          completedAt: batchJob.completedAt,
          createdBy: batchJob.user
            ? {
                nombre: batchJob.user.nombre,
                apellido: batchJob.user.apellido,
                email: batchJob.user.email,
              }
            : null,
        },
      };
    }
  );

  // GET /calls/cronograma - Cronograma de callbacks generados desde resúmenes de llamadas
  fastify.get(
    '/calls/cronograma',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { status = 'PENDING', from: fromStr, to: toStr, limit = '50', offset = '0' } = request.query as {
        status?: string;
        from?: string;
        to?: string;
        limit?: string;
        offset?: string;
      };

      const where: any = {
        tenantId: user.tenant_id,
      };
      if (status) {
        where.status = status;
      }
      if (fromStr || toStr) {
        where.scheduledAt = {};
        if (fromStr) where.scheduledAt.gte = new Date(fromStr);
        if (toStr) where.scheduledAt.lte = new Date(toStr);
      }

      const callbacks = await prisma.scheduledCallback.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        include: {
          customer: { select: { id: true, razonSocial: true, codigoUnico: true, telefono: true } },
          invoice: { select: { id: true, numero: true, monto: true } },
        },
      });

      const total = await prisma.scheduledCallback.count({ where });

      return {
        callbacks: callbacks.map((c: (typeof callbacks)[number]) => ({
          id: c.id,
          customerId: c.customerId,
          customer: c.customer,
          invoiceId: c.invoiceId,
          invoice: c.invoice,
          sourceContactEventId: c.sourceContactEventId,
          scheduledAt: c.scheduledAt,
          type: c.type,
          reason: c.reason,
          status: c.status,
          createdAt: c.createdAt,
        })),
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    }
  );

  // POST /calls/webhooks/elevenlabs - Webhook de ElevenLabs para recibir datos de llamadas completadas
  fastify.post(
    '/calls/webhooks/elevenlabs',
    async (request, reply) => {
      try {
        const rawBody = request.body as any;
        fastify.log.info({ body: rawBody }, 'Webhook de ElevenLabs recibido');

        // ElevenLabs envía un envelope: { type, event_timestamp, data: {...} }
        // El payload real está en `data`; mantenemos fallback al body plano por compatibilidad.
        const eventType: string | undefined = rawBody?.type;
        const data: any = rawBody?.data && typeof rawBody.data === 'object' ? rawBody.data : rawBody;

        // Ignoramos eventos que no son de transcripción (audio, call_initiation_failure).
        if (eventType && eventType !== 'post_call_transcription') {
          fastify.log.info({ eventType }, 'Evento de ElevenLabs ignorado');
          return reply.status(200).send({ received: true, ignored: true, eventType });
        }

        const {
          conversation_id,
          transcript,
          analysis,
          messages,
          status: rawStatus,
        } = data;
        const audio_url = data.audio_url || null;
        const summary = data.summary;
        const metadata = data.metadata || {};
        const duration: number | null = metadata.call_duration_secs ?? data.duration ?? null;
        const status: string | undefined = rawStatus;
        const isCompleted = status === 'done' || status === 'completed' || status === 'success';
        const isFailed = status === 'failed' || status === 'failure';

        if (!conversation_id) {
          return reply.status(400).send({ error: 'conversation_id es requerido' });
        }

        // Extraer transcripción. En el shape oficial, `transcript` es un array de turns.
        let finalTranscript: string | null = null;
        if (Array.isArray(transcript)) {
          finalTranscript = transcript
            .filter((turn: any) => turn?.message || turn?.content)
            .map((turn: any) => `${turn.role}: ${turn.message || turn.content || ''}`)
            .join('\n');
        } else if (typeof transcript === 'string') {
          finalTranscript = transcript;
        } else if (analysis?.transcript) {
          finalTranscript =
            typeof analysis.transcript === 'string'
              ? analysis.transcript
              : Array.isArray(analysis.transcript)
                ? analysis.transcript
                    .map((turn: any) => `${turn.role}: ${turn.message || turn.content || ''}`)
                    .join('\n')
                : null;
        } else if (Array.isArray(messages)) {
          finalTranscript = messages
            .filter((msg: any) => msg.content || msg.message)
            .map((msg: any) => `${msg.role}: ${msg.content || msg.message || ''}`)
            .join('\n');
        }

        // Extraer resumen
        let finalSummary = summary;
        if (!finalSummary && analysis?.transcript_summary) {
          finalSummary = analysis.transcript_summary;
        }

        const dynamicVariables = extractDynamicVariables(data);
        const contactEventId = dynamicVariables.contact_event_id;

        // Buscar el ContactEvent por ID explícito de variables dinámicas o por conversation_id.
        const contactEvent = await prisma.contactEvent.findFirst({
          where: contactEventId
            ? {
                id: contactEventId,
              }
            : {
                externalMessageId: conversation_id,
              },
          include: {
            batch: true,
            customer: true,
          },
        });

        let callbacksCreated = 0;
        let promisesCreated = 0;

        if (contactEvent) {
          // Actualizar el evento existente
          const previousPayload = (contactEvent.payload || {}) as any;

          await prisma.contactEvent.update({
            where: { id: contactEvent.id },
            data: {
              transcription: finalTranscript || null,
              callSummary: finalSummary || null,
              callDuration: duration || null,
              status: isCompleted ? 'SENT' : isFailed ? 'FAILED' : 'PENDING',
              externalMessageId: conversation_id,
              mediaUrl: audio_url || null,
              payload: {
                ...data,
                dynamicVariables,
                postCallWhatsApp: previousPayload.postCallWhatsApp || {
                  enabled: POST_CALL_WHATSAPP_ENABLED,
                  sent: false,
                },
              },
            },
          });

          fastify.log.info(
            { contactEventId: contactEvent.id, conversationId: conversation_id },
            'ContactEvent actualizado desde webhook'
          );

          // A partir del resumen de la IA: crear callbacks y promesas de pago (cronograma)
          if (finalSummary && isCompleted) {
            try {
              const result = await processCallSummaryForCallbacks(finalSummary, {
                tenantId: contactEvent.tenantId,
                customerId: contactEvent.customerId,
                invoiceId: contactEvent.invoiceId ?? null,
                sourceContactEventId: contactEvent.id,
              });
              promisesCreated = result.promisesCreated;
              callbacksCreated = result.callbacksCreated;
              if (promisesCreated > 0 || callbacksCreated > 0) {
                fastify.log.info(
                  { contactEventId: contactEvent.id, promisesCreated, callbacksCreated },
                  'Callbacks y promesas creados desde resumen de llamada'
                );
              }
            } catch (err: any) {
              fastify.log.warn(
                { contactEventId: contactEvent.id, error: err?.message },
                'Error creando callbacks/promesas desde resumen (no bloqueante)'
              );
            }
          }

          if (
            isCompleted &&
            contactEvent.customer?.telefono &&
            !previousPayload.postCallWhatsApp?.sent &&
            shouldSendPostCallWhatsApp({
              summary: finalSummary,
              transcript: finalTranscript,
              variables: dynamicVariables,
            })
          ) {
            try {
              const NOTIFIER_URL = getNotifierBaseUrl();
              const message = await buildPostCallWhatsAppMessage({
                tenantId: contactEvent.tenantId,
                customerId: contactEvent.customerId,
                invoiceId: contactEvent.invoiceId,
              });

              const response = await axios.post(
                `${NOTIFIER_URL}/notify/send-direct`,
                {
                  channel: 'WHATSAPP',
                  to: contactEvent.customer.telefono,
                  message,
                  tenantId: contactEvent.tenantId,
                  source: 'elevenlabs-post-call',
                },
                { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
              );

              await prisma.contactEvent.create({
                data: {
                  tenantId: contactEvent.tenantId,
                  customerId: contactEvent.customerId,
                  invoiceId: contactEvent.invoiceId,
                  batchId: contactEvent.batchId,
                  channel: 'WHATSAPP',
                  direction: 'OUTBOUND',
                  isManual: false,
                  messageText: message,
                  status: 'SENT',
                  externalMessageId: response.data?.messageId || null,
                  payload: {
                    source: 'elevenlabs-post-call',
                    sourceContactEventId: contactEvent.id,
                    response: response.data,
                  } as any,
                  ts: new Date(),
                },
              });

              await prisma.contactEvent.update({
                where: { id: contactEvent.id },
                data: {
                  payload: {
                    ...data,
                    dynamicVariables,
                    postCallWhatsApp: {
                      enabled: POST_CALL_WHATSAPP_ENABLED,
                      sent: true,
                      sentAt: new Date().toISOString(),
                    },
                  },
                },
              });

              fastify.log.info(
                { contactEventId: contactEvent.id, customerId: contactEvent.customerId },
                'WhatsApp post-llamada enviado'
              );
            } catch (err: any) {
              fastify.log.warn(
                { contactEventId: contactEvent.id, error: err?.message },
                'Error enviando WhatsApp post-llamada (no bloqueante)'
              );
            }
          }
        } else {
          // Si no encontramos el evento, podría ser una llamada que no se registró previamente
          // En este caso, solo logueamos el webhook
          fastify.log.warn(
            { conversationId: conversation_id },
            'Webhook recibido pero no se encontró ContactEvent correspondiente'
          );
        }

        return reply.status(200).send({
          received: true,
          conversation_id,
          transcript_saved: !!finalTranscript,
          summary_saved: !!finalSummary,
          promises_created: promisesCreated,
          callbacks_created: callbacksCreated,
        });
      } catch (error: any) {
        fastify.log.error({ error: error.message }, 'Error procesando webhook de ElevenLabs');
        return reply.status(500).send({
          error: 'Error procesando webhook',
          message: error.message,
        });
      }
    }
  );
}

