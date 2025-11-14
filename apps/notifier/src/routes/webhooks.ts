import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
// SimpleLogger está disponible globalmente desde types.d.ts

const prisma = new PrismaClient();

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

export async function webhookRoutes(fastify: FastifyInstance) {
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

      // Crear registro en contact.events
      const contactEvent = await prisma.contactEvent.create({
        data: {
          tenantId: customer.tenantId,
          customerId: customer.id,
          invoiceId: null, // Se puede asociar después con NLP
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

      // TODO: Procesar con NLP service si hay texto
      // Si el mensaje contiene intents como "pago mañana", crear promesa
      // Si contiene entidades como monto/fecha, extraerlas
      // Esto se puede hacer de forma asíncrona con una cola

      return reply.status(200).send({
        status: 'ok',
        eventId: contactEvent.id,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        fastify.log.warn({ error: error.errors }, 'Invalid webhook payload');
        return reply.status(400).send({ error: 'Invalid payload', details: error.errors });
      }

      fastify.log.error({ error: error.message }, 'Error processing WhatsApp webhook');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

