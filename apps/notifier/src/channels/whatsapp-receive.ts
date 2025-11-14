import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BUILDERBOT_API_URL = process.env.BUILDERBOT_API_URL || 'https://api.builderbot.cloud';
const BUILDERBOT_API_KEY = process.env.BUILDERBOT_API_KEY;

interface BuilderbotMessage {
  id: string;
  from: string;
  message: {
    type: 'text' | 'VOICE_NOTE' | 'image' | 'document';
    text?: string;
    media_url?: string;
    transcription?: string;
  };
  timestamp: string;
  status?: string;
}

/**
 * Consulta la API de builderbot para obtener mensajes nuevos
 * @param lastMessageId - ID del último mensaje procesado (para evitar duplicados)
 * @returns Array de mensajes nuevos
 */
export async function fetchIncomingMessages(
  lastMessageId?: string
): Promise<BuilderbotMessage[]> {
  if (!BUILDERBOT_API_KEY) {
    throw new Error('BUILDERBOT_API_KEY not configured');
  }

  try {
    // Consultar mensajes entrantes desde builderbot
    // Ajusta el endpoint según la documentación de builderbot
    const response = await axios.get(
      `${BUILDERBOT_API_URL}/v1/messages/incoming`,
      {
        headers: {
          Authorization: `Bearer ${BUILDERBOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
        params: {
          since: lastMessageId, // Si builderbot soporta paginación por ID
          limit: 100, // Cantidad de mensajes a obtener
          status: 'unread', // Solo mensajes no leídos
        },
      }
    );

    // Ajusta según la estructura de respuesta de builderbot
    return response.data.messages || response.data || [];
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `Builderbot API error: ${error.response.status} - ${error.response.data?.message || error.message}`
      );
    }
    throw error;
  }
}

/**
 * Procesa un mensaje entrante y lo registra en la base de datos
 */
export async function processIncomingMessage(message: BuilderbotMessage) {
  // Buscar cliente por teléfono
  const phoneNumber = message.from.replace(/^\+/, '');
  const phoneVariations = [
    phoneNumber,
    `+${phoneNumber}`,
    phoneNumber.replace(/^54/, '549'),
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
    // Log pero no fallar - podría ser un número no registrado
    console.warn(`Customer not found for phone: ${message.from}`);
    return null;
  }

  // Determinar el texto del mensaje
  let messageText = '';
  if (message.message.type === 'text' && message.message.text) {
    messageText = message.message.text;
  } else if (message.message.type === 'VOICE_NOTE' && message.message.transcription) {
    messageText = message.message.transcription;
  } else if (message.message.type === 'VOICE_NOTE') {
    messageText = '[Mensaje de voz]';
  } else if (message.message.type === 'image') {
    messageText = '[Imagen]';
  } else if (message.message.type === 'document') {
    messageText = '[Documento]';
  }

  // Verificar si ya existe (idempotencia)
  const existingEvent = await prisma.contactEvent.findFirst({
    where: {
      externalMessageId: message.id,
      direction: 'INBOUND',
      channel: 'WHATSAPP',
    },
  });

  if (existingEvent) {
    console.log(`Message ${message.id} already processed`);
    return existingEvent;
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
      externalMessageId: message.id,
      mediaUrl: message.message.media_url || undefined,
      ts: new Date(message.timestamp || Date.now()),
    },
  });

  return contactEvent;
}

