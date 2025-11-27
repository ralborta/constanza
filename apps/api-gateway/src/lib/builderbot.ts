import axios from 'axios';

const BUILDERBOT_BASE_URL =
  process.env.BUILDERBOT_BASE_URL || 'https://app.builderbot.cloud';

export interface SendWhatsAppOptions {
  number: string; // número en formato internacional
  message: string; // contenido del mensaje
  mediaUrl?: string; // opcional
  checkIfExists?: boolean; // sin uso en v1 estándar
}

/**
 * Envía UN mensaje de WhatsApp vía BuilderBot (formato estándar).
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions) {
  const { number, message, mediaUrl } = options;

  let BOT_ID =
    (process.env.BUILDERBOT_BOT_ID ||
      process.env.BUILDERBOT_BOTID ||
      process.env.BOT_ID ||
      '').trim();
  const API_KEY =
    (process.env.BUILDERBOT_API_KEY ||
      process.env.BUILDERBOT_KEY ||
      process.env.BB_API_KEY ||
      '').trim();

  if (!BOT_ID) {
    console.warn('⚠️ [BuilderBot] BUILDERBOT_BOT_ID no definido. Usando fallback de pruebas.');
    BOT_ID = '5e3f81b5-8f3f-4684-b22c-03567371b6c1';
  }

  if (!API_KEY) {
    console.warn('⚠️ [BuilderBot] BUILDERBOT_API_KEY no definido.');
  }

  // URL v1 estándar; se pasa botId por query para compatibilidad
  const url = `${BUILDERBOT_BASE_URL}/v1/messages?botId=${encodeURIComponent(BOT_ID)}`;

  const body: Record<string, any> = {
    number,
    message,
  };

  if (mediaUrl) {
    body.media = mediaUrl;
  }

  const headers = {
    'Content-Type': 'application/json',
    'api-key': API_KEY,
    'x-api-builderbot': API_KEY,
  };

  const response = await axios.post(url, body, { headers, timeout: 30000 });
  return response.data;
}


