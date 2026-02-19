import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { processMessageForCallbacks } from '../services/callbacks-from-message.js';
import { obtenerContextoCliente } from '../services/cobranza-context.js';
import { construirPromptDinamico } from '../services/prompt-builder.js';
import { llamarOpenAICobranza } from '../services/openai-cobranza.js';
import { getPoliticasCobranza } from '../services/cobranza-politicas.js';
import { sendWhatsAppMessage } from '../lib/builderbot.js';
// SimpleLogger está disponible globalmente desde types.d.ts

const prisma = new PrismaClient();

/**
 * Correlation Engine: Asocia mensajes inbound a facturas
 * Busca por:
 * 1. CONST_ID explícito en el mensaje
 * 2. Número de factura mencionado
 * 3. In-Reply-To (para emails)
 * 4. Ventana temporal (factura más reciente del cliente)
 */
async function correlateInvoice(
  customerId: string,
  tenantId: string,
  messageText: string,
  metadata?: {
    inReplyTo?: string;
    extractedData?: {
      facturaNumero?: string;
      invoiceId?: string;
    };
  }
): Promise<string | null> {
  // 1. Si ya viene invoiceId en extractedData, usarlo
  if (metadata?.extractedData?.invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: metadata.extractedData.invoiceId,
        customerId,
        tenantId,
      },
    });
    if (invoice) {
      return invoice.id;
    }
  }

  // 2. Buscar CONST_ID en el mensaje (formato: CONST_123456 o #123456)
  const constIdMatch = messageText.match(/CONST[_\s]?(\d+)|#(\d+)/i);
  if (constIdMatch) {
    const invoiceNum = constIdMatch[1] || constIdMatch[2];
    const invoice = await prisma.invoice.findFirst({
      where: {
        numero: invoiceNum,
        customerId,
        tenantId,
      },
    });
    if (invoice) {
      return invoice.id;
    }
  }

  // 3. Buscar número de factura mencionado (de extractedData o del texto)
  const facturaNumero = metadata?.extractedData?.facturaNumero;
  if (facturaNumero) {
    const invoice = await prisma.invoice.findFirst({
      where: {
        numero: facturaNumero,
        customerId,
        tenantId,
      },
    });
    if (invoice) {
      return invoice.id;
    }
  }

  // 4. Buscar por In-Reply-To (para emails)
  if (metadata?.inReplyTo) {
    // Buscar el evento original por externalMessageId
    const originalEvent = await prisma.contactEvent.findFirst({
      where: {
        externalMessageId: metadata.inReplyTo,
        tenantId,
        direction: 'OUTBOUND',
      },
    });
    if (originalEvent?.invoiceId) {
      return originalEvent.invoiceId;
    }
  }

  // 5. Fallback: factura más reciente activa del cliente (para que inbounds aparezcan en el timeline)
  const recentInvoice = await prisma.invoice.findFirst({
    where: {
      customerId,
      tenantId,
      estado: {
        in: ['ABIERTA', 'VENCIDA', 'PARCIAL'],
      },
    },
    orderBy: {
      fechaVto: 'desc',
    },
  });

  if (recentInvoice) {
    return recentInvoice.id;
  }

  return null;
}

// Schema para validar webhook de builderbot
const builderbotWebhookSchema = z.object({
  from: z.string(), // Número de teléfono (ej: "5491123456789")
  message: z.object({
    type: z.enum(['text', 'VOICE_NOTE', 'image', 'document']),
    text: z.string().optional(), // Solo si type = "text"
    media_url: z.string().url().optional(), // URL del audio/imagen/documento
    transcription: z.string().optional(), // Transcripción del audio (si está disponible)
  }),
  timestamp: z.string(), // ISO datetime
  message_id: z.string().optional(), // ID del mensaje en builderbot
});

// Schema para validar webhook de OpenAI Agent Builder (email inbound)
const openaiEmailWebhookSchema = z.object({
  customerId: z.string().uuid(), // Ya identificado por OpenAI Agent
  invoiceId: z.string().uuid().optional(), // Ya correlacionado (si OpenAI lo encontró)
  messageText: z.string(), // Texto del email
  subject: z.string(), // Asunto del email
  from: z.string().email(), // Email del cliente
  messageId: z.string().optional(), // Message-ID del email
  inReplyTo: z.string().optional(), // In-Reply-To header
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url().optional(),
    contentType: z.string().optional(),
    size: z.number().optional(),
  })).optional(),
  extractedData: z.object({
    intent: z.string().optional(), // "pago", "consulta", "reclamo"
    amount: z.number().optional(), // Si mencionó monto
    date: z.string().optional(), // Si mencionó fecha
    facturaNumero: z.string().optional(), // Si mencionó número de factura
    sentiment: z.string().optional(), // "positive", "negative", "neutral"
  }).optional(),
  summary: z.string().optional(), // Resumen generado por OpenAI Agent
  agentResponse: z.string().optional(), // Si OpenAI Agent generó respuesta
  timestamp: z.string().optional(), // ISO datetime
});

// Schema unificado para webhook inbound de cualquier canal
const unifiedInboundSchema = z.object({
  channel: z.enum(['WHATSAPP', 'EMAIL', 'VOICE']),
  customerId: z.string().uuid(), // Ya identificado por el agente externo
  invoiceId: z.string().uuid().optional(), // Opcional - si el agente ya lo correlacionó
  messageText: z.string(),
  from: z.string(), // Email o teléfono según canal
  metadata: z.object({
    messageId: z.string().optional(),
    inReplyTo: z.string().optional(), // Para EMAIL
    subject: z.string().optional(), // Para EMAIL
    attachments: z.array(z.object({
      filename: z.string(),
      url: z.string().url().optional(),
      contentType: z.string().optional(),
      size: z.number().optional(),
    })).optional(), // Para EMAIL
    transcription: z.string().optional(), // Para VOICE
    duration: z.number().optional(), // Para VOICE
    mediaUrl: z.string().url().optional(), // Para WHATSAPP/VOICE
  }).optional(),
  extractedData: z.object({
    intent: z.string().optional(),
    amount: z.number().optional(),
    date: z.string().optional(),
    facturaNumero: z.string().optional(),
    invoiceId: z.string().uuid().optional(),
    sentiment: z.string().optional(),
  }).optional(),
  summary: z.string().optional(),
  agentResponse: z.string().optional(),
  timestamp: z.string().optional(),
});

export async function webhookRoutes(fastify: FastifyInstance) {
  // POST /wh/inbound - Endpoint unificado para todos los canales inbound
  fastify.post('/inbound', async (request, reply) => {
    const body = request.body as any;

    try {
      const data = unifiedInboundSchema.parse(body);

      fastify.log.info(
        { channel: data.channel, customerId: data.customerId },
        'Received unified inbound webhook'
      );

      // Verificar que el cliente existe
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          activo: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!customer) {
        fastify.log.warn({ customerId: data.customerId }, 'Customer not found');
        return reply.status(404).send({
          status: 'error',
          error: 'Customer not found',
          customerId: data.customerId,
        });
      }

      // Correlacionar con factura usando el Correlation Engine
      let invoiceId = data.invoiceId || null;
      if (!invoiceId) {
        invoiceId = await correlateInvoice(
          customer.id,
          customer.tenantId,
          data.messageText,
          {
            inReplyTo: data.metadata?.inReplyTo,
            extractedData: data.extractedData,
          }
        );
      } else {
        // Verificar que la factura existe y pertenece al cliente
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: invoiceId,
            customerId: customer.id,
            tenantId: customer.tenantId,
          },
        });
        if (!invoice) {
          fastify.log.warn(
            { invoiceId, customerId: customer.id },
            'Invoice not found or does not belong to customer'
          );
          invoiceId = null;
        }
      }

      // Preparar payload completo
      const payload: any = {
        from: data.from,
        metadata: data.metadata || {},
      };

      if (data.extractedData) {
        payload.extractedData = data.extractedData;
      }

      if (data.summary) {
        payload.summary = data.summary;
      }

      if (data.agentResponse) {
        payload.agentResponse = data.agentResponse;
      }

      // Determinar mediaUrl según canal
      let mediaUrl: string | undefined;
      if (data.channel === 'EMAIL' && data.metadata?.attachments?.[0]?.url) {
        mediaUrl = data.metadata.attachments[0].url;
      } else if (data.metadata?.mediaUrl) {
        mediaUrl = data.metadata.mediaUrl;
      }

      // Crear registro en contact.events
      const contactEvent = await prisma.contactEvent.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          invoiceId: invoiceId,
          channel: data.channel,
          direction: 'INBOUND',
          isManual: false,
          messageText: data.messageText,
          status: 'DELIVERED',
          externalMessageId: data.metadata?.messageId || undefined,
          mediaUrl: mediaUrl,
          transcription: data.metadata?.transcription || undefined,
          callDuration: data.metadata?.duration || undefined,
          callSummary: data.summary || undefined,
          payload: payload,
          ts: new Date(data.timestamp || Date.now()),
        },
      });

      fastify.log.info(
        {
          eventId: contactEvent.id,
          customerId: customer.id,
          invoiceId: invoiceId,
          channel: data.channel,
        },
        'Inbound message registered via unified endpoint'
      );

      return reply.status(200).send({
        status: 'ok',
        eventId: contactEvent.id,
        customerId: customer.id,
        invoiceId: invoiceId,
        correlated: !!invoiceId,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        fastify.log.warn({ error: error.issues }, 'Invalid unified inbound webhook payload');
        return reply.status(400).send({ error: 'Invalid payload', details: error.issues });
      }

      fastify.log.error({ error: error.message }, 'Error processing unified inbound webhook');
      return reply.status(500).send({ error: 'Internal error' });
    }
  });

  // POST /wh/wa/incoming - Webhook de mensajes entrantes de WhatsApp
  fastify.post('/wa/incoming', async (request, reply) => {
    const body = request.body as any;

    try {
      // Validar payload
      const data = builderbotWebhookSchema.parse(body);

      fastify.log.info(
        { from: data.from, type: data.message.type },
        'Received WhatsApp webhook'
      );

      // Buscar cliente por teléfono
      // El formato puede ser "5491123456789" o "+5491123456789"
      const phoneNumber = data.from.replace(/^\+/, ''); // Remover + si existe
      const phoneVariations = [
        phoneNumber,
        `+${phoneNumber}`,
        phoneNumber.replace(/^54/, '549'), // Si empieza con 54, agregar 9
      ];

      const customer = await prisma.customer.findFirst({
        where: {
          OR: phoneVariations.map((phone) => ({
            telefono: {
              contains: phone,
            },
          })),
          activo: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!customer) {
        fastify.log.warn({ from: data.from }, 'Customer not found for phone number');
        // Aún así registramos el evento para auditoría
        // TODO: Podríamos crear un cliente temporal o marcarlo para revisión
        return reply.status(200).send({ status: 'ok', note: 'customer_not_found' });
      }

      // Determinar el texto del mensaje
      let messageText = '';
      if (data.message.type === 'text' && data.message.text) {
        messageText = data.message.text;
      } else if (data.message.type === 'VOICE_NOTE' && data.message.transcription) {
        messageText = data.message.transcription;
      } else if (data.message.type === 'VOICE_NOTE') {
        messageText = '[Mensaje de voz]'; // Placeholder si no hay transcripción
      } else if (data.message.type === 'image') {
        messageText = '[Imagen]';
      } else if (data.message.type === 'document') {
        messageText = '[Documento]';
      }

      // Correlacionar con factura usando el Correlation Engine
      const invoiceId = await correlateInvoice(
        customer.id,
        customer.tenantId,
        messageText
      );

      // Crear registro en contact.events
      const contactEvent = await prisma.contactEvent.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          invoiceId: invoiceId,
          channel: 'WHATSAPP',
          direction: 'INBOUND',
          isManual: false,
          messageText,
          status: 'DELIVERED',
          externalMessageId: data.message_id || undefined,
          mediaUrl: data.message.media_url || undefined,
          ts: new Date(data.timestamp || Date.now()),
        },
      });

      fastify.log.info(
        { eventId: contactEvent.id, customerId: customer.id },
        'WhatsApp message registered'
      );

      // Extraer promesas y callbacks del mensaje (IA) y crear en BD
      if (messageText && messageText.length >= 10) {
        try {
          const result = await processMessageForCallbacks(
            messageText,
            {
              tenantId: customer.tenantId,
              customerId: customer.id,
              invoiceId: invoiceId ?? null,
              sourceContactEventId: contactEvent.id,
            },
            'WHATSAPP'
          );
          if (result.promisesCreated > 0 || result.callbacksCreated > 0) {
            fastify.log.info(
              { eventId: contactEvent.id, ...result },
              'Promesas/callbacks creados desde mensaje WhatsApp'
            );
          }
        } catch (err: any) {
          fastify.log.warn(
            { eventId: contactEvent.id, error: err?.message },
            'Error extrayendo callbacks/promesas del mensaje (no bloqueante)'
          );
        }
      }

      // Flujo contexto dinámico cobranza: obtener contexto → políticas (desde BD) → prompt → OpenAI → guardar → enviar por BuilderBot
      const textoUtilParaIA = messageText && messageText.length >= 3 && !['[Imagen]', '[Documento]', '[Mensaje de voz]'].includes(messageText.trim());
      if (textoUtilParaIA) {
        try {
          const contexto = await obtenerContextoCliente(data.from);
          const politicas = await getPoliticasCobranza(customer.tenantId);
          const prompt = construirPromptDinamico(contexto, messageText, politicas as any);
          const { respuesta, tokens_usados, modelo } = await llamarOpenAICobranza(prompt);
          const payloadActual = (contactEvent.payload as Record<string, unknown>) || {};
          await prisma.contactEvent.update({
            where: { id: contactEvent.id },
            data: {
              payload: {
                ...payloadActual,
                respuesta_agente: respuesta,
                tokens_usados: tokens_usados,
                modelo_ia: modelo,
                contexto_cobranza_used: true,
              },
            },
          });
          await sendWhatsAppMessage({ number: data.from, message: respuesta });
          fastify.log.info({ eventId: contactEvent.id, tokens_usados, modelo }, 'Cobranza IA: respuesta enviada por BuilderBot');
        } catch (err: any) {
          fastify.log.warn({ eventId: contactEvent.id, error: err?.message }, 'Error flujo cobranza IA (no bloqueante)');
          try {
            await sendWhatsAppMessage({
              number: data.from,
              message: 'Disculpa, tuve un problema procesando tu mensaje. Por favor intenta de nuevo en un momento.',
            });
          } catch (e: any) {
            fastify.log.warn({ error: e?.message }, 'Error enviando mensaje de fallback');
          }
        }
      }

      return reply.status(200).send({
        status: 'ok',
        eventId: contactEvent.id,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        fastify.log.warn({ error: error.issues }, 'Invalid webhook payload');
        return reply.status(400).send({ error: 'Invalid payload', details: error.issues });
      }

      fastify.log.error({ error: error.message }, 'Error processing WhatsApp webhook');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /wh/email/incoming - Webhook de emails entrantes procesados por OpenAI Agent Builder
  fastify.post('/email/incoming', async (request, reply) => {
    const body = request.body as any;

    try {
      // Validar payload
      const data = openaiEmailWebhookSchema.parse(body);

      fastify.log.info(
        { customerId: data.customerId, invoiceId: data.invoiceId, subject: data.subject },
        'Received email webhook from OpenAI Agent Builder'
      );

      // Verificar que el cliente existe
      const customer = await prisma.customer.findFirst({
        where: {
          id: data.customerId,
          activo: true,
        },
        include: {
          tenant: true,
        },
      });

      if (!customer) {
        fastify.log.warn({ customerId: data.customerId }, 'Customer not found');
        return reply.status(404).send({ 
          status: 'error', 
          error: 'Customer not found',
          customerId: data.customerId 
        });
      }

      // Verificar que la factura existe si se proporcionó, o correlacionar
      let invoiceId = data.invoiceId || null;
      if (invoiceId) {
        const invoice = await prisma.invoice.findFirst({
          where: {
            id: invoiceId,
            customerId: data.customerId,
            tenantId: customer.tenantId,
          },
        });

        if (!invoice) {
          fastify.log.warn(
            { invoiceId, customerId: data.customerId },
            'Invoice not found or does not belong to customer'
          );
          invoiceId = null; // Continuar sin factura si no se encuentra
        }
      }

      // Si no hay invoiceId, intentar correlacionar usando Correlation Engine
      if (!invoiceId) {
        invoiceId = await correlateInvoice(
          customer.id,
          customer.tenantId,
          data.messageText,
          {
            inReplyTo: data.inReplyTo,
            extractedData: data.extractedData,
          }
        );
      }

      // Preparar payload con datos extraídos por OpenAI Agent
      const payload: any = {
        from: data.from,
        subject: data.subject,
        messageId: data.messageId,
        inReplyTo: data.inReplyTo,
        attachments: data.attachments || [],
      };

      if (data.extractedData) {
        payload.extractedData = data.extractedData;
      }

      if (data.summary) {
        payload.summary = data.summary;
      }

      if (data.agentResponse) {
        payload.agentResponse = data.agentResponse;
      }

      // Crear registro en contact.events
      const contactEvent = await prisma.contactEvent.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          invoiceId: invoiceId,
          channel: 'EMAIL',
          direction: 'INBOUND',
          isManual: false,
          messageText: data.messageText,
          status: 'DELIVERED',
          externalMessageId: data.messageId || undefined,
          payload: payload,
          ts: new Date(data.timestamp || Date.now()),
        },
      });

      fastify.log.info(
        { eventId: contactEvent.id, customerId: customer.id, invoiceId: invoiceId },
        'Email message registered from OpenAI Agent Builder'
      );

      // Extraer promesas y callbacks del mensaje (IA) y crear en BD
      const emailBody = data.messageText || (data.summary as string) || '';
      if (emailBody && emailBody.length >= 10) {
        try {
          const result = await processMessageForCallbacks(
            emailBody,
            {
              tenantId: customer.tenantId,
              customerId: customer.id,
              invoiceId: invoiceId ?? null,
              sourceContactEventId: contactEvent.id,
            },
            'EMAIL'
          );
          if (result.promisesCreated > 0 || result.callbacksCreated > 0) {
            fastify.log.info(
              { eventId: contactEvent.id, ...result },
              'Promesas/callbacks creados desde mensaje Email'
            );
          }
        } catch (err: any) {
          fastify.log.warn(
            { eventId: contactEvent.id, error: err?.message },
            'Error extrayendo callbacks/promesas del email (no bloqueante)'
          );
        }
      }

      return reply.status(200).send({
        status: 'ok',
        eventId: contactEvent.id,
        customerId: customer.id,
        invoiceId: invoiceId,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        fastify.log.warn({ error: error.issues }, 'Invalid email webhook payload');
        return reply.status(400).send({ error: 'Invalid payload', details: error.issues });
      }

      fastify.log.error({ error: error.message }, 'Error processing email webhook');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

