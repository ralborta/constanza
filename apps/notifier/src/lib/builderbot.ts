import axios from 'axios';

const BUILDERBOT_BASE_URL =
  process.env.BUILDERBOT_BASE_URL || 'https://app.builderbot.cloud';

export interface SendWhatsAppOptions {
  number: string; // número en formato internacional
  message: string; // contenido del mensaje
  mediaUrl?: string; // opcional
  checkIfExists?: boolean; // default false
}

/**
 * Envía UN mensaje de WhatsApp vía BuilderBot Cloud (API v2).
 * - Unico destinatario por llamada (sin batch).
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions) {
  const { number, message, mediaUrl, checkIfExists = false } = options;

  // Leer SIEMPRE del entorno en tiempo de ejecución, no en import-time
  const BOT_ID = process.env.BUILDERBOT_BOT_ID;
  const API_KEY = process.env.BUILDERBOT_API_KEY;

  if (!BOT_ID || !API_KEY) {
    throw new Error(
      'BuilderBot no configurado: define BUILDERBOT_BOT_ID y BUILDERBOT_API_KEY'
    );
  }

  const url = `${BUILDERBOT_BASE_URL}/api/v2/${BOT_ID}/messages`;

  const body: Record<string, any> = {
    messages: {
      content: message,
    },
    number,
    checkIfExists,
  };

  if (mediaUrl) {
    body.messages.mediaUrl = mediaUrl;
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-api-builderbot': API_KEY as string,
  };

  const response = await axios.post(url, body, { headers, timeout: 30000 });
  return response.data;
}


