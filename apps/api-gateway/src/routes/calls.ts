import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { getNotifierBaseUrl } from '../lib/config.js';

// Configuración de ElevenLabs
const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;

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

        // Preparar contactos para ElevenLabs Batch Calling
        const recipients = batchData.rows.map((row: any) => ({
          phone_number: formatPhoneNumber(row.telefono),
          conversation_initiation_client_data: {
            type: 'conversation_initiation_client_data',
            dynamic_variables: row.variables || {},
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

        // Crear registros de ContactEvent para cada llamada
        const eventsToCreate = batchData.rows.map((row: any) => ({
          tenantId: user.tenant_id,
          batchId: batchJob.id,
          customerId: row.customerId,
          invoiceId: row.invoiceId || null,
          channel: 'VOICE',
          direction: 'OUTBOUND',
          isManual: false,
          messageText: row.script,
          status: 'PENDING',
          externalMessageId: null, // Se actualizará cuando llegue el webhook
          ts: new Date(),
        }));

        await prisma.contactEvent.createMany({
          data: eventsToCreate,
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

  // POST /calls/webhooks/elevenlabs - Webhook de ElevenLabs para recibir datos de llamadas completadas
  fastify.post(
    '/calls/webhooks/elevenlabs',
    async (request, reply) => {
      try {
        const body = request.body as any;
        fastify.log.info({ body }, 'Webhook de ElevenLabs recibido');

        const {
          conversation_id,
          type,
          transcript,
          analysis,
          messages,
          conversation_initiation_client_data,
          audio_url,
          summary,
          phone_number,
          status,
          duration,
        } = body;

        if (!conversation_id) {
          return reply.status(400).send({ error: 'conversation_id es requerido' });
        }

        // Extraer transcripción de múltiples fuentes posibles
        let finalTranscript = transcript;
        if (!finalTranscript && analysis?.transcript) {
          finalTranscript = analysis.transcript;
        } else if (!finalTranscript && messages && Array.isArray(messages)) {
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

        // Buscar el ContactEvent por externalMessageId (conversation_id)
        const contactEvent = await prisma.contactEvent.findFirst({
          where: {
            externalMessageId: conversation_id,
          },
          include: {
            batch: true,
          },
        });

        if (contactEvent) {
          // Actualizar el evento existente
          await prisma.contactEvent.update({
            where: { id: contactEvent.id },
            data: {
              transcription: finalTranscript || null,
              callSummary: finalSummary || null,
              callDuration: duration || null,
              status: status === 'completed' ? 'SENT' : status === 'failed' ? 'FAILED' : 'PENDING',
              mediaUrl: audio_url || null,
              payload: body,
            },
          });

          fastify.log.info(
            { contactEventId: contactEvent.id, conversationId: conversation_id },
            'ContactEvent actualizado desde webhook'
          );
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

