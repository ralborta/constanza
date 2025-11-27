import axios from 'axios';

// Base URL de BuilderBot (sin slash final)
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
 * - Un único destinatario por llamada (sin batch).
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions) {
  const { number, message, mediaUrl } = options;

  // Leer SIEMPRE del entorno en tiempo de ejecución, no en import-time
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

  // Fallback solo para pruebas
  if (!BOT_ID) {
    console.warn('⚠️ [BuilderBot] BUILDERBOT_BOT_ID no definido. Usando fallback de pruebas.');
    BOT_ID = '5e3f81b5-8f3f-4684-b22c-03567371b6c1';
  }

  if (!API_KEY) {
    console.warn('⚠️ [BuilderBot] BUILDERBOT_API_KEY no definido.');
  }

  // URL de la API (v1 estándar). Si tu instancia requiere el botId, se pasa por query.
  const url = `${BUILDERBOT_BASE_URL}/v1/messages?botId=${encodeURIComponent(BOT_ID)}`;

  // Payload estándar para BuilderBot
  const body: Record<string, any> = {
    number,
    message,
  };

  if (mediaUrl) {
    // Algunas variantes aceptan 'media' o 'mediaUrl'
    body.media = mediaUrl;
  }

  // Headers – se incluyen ambas variantes por compatibilidad
  const headers = {
    'Content-Type': 'application/json',
    'api-key': API_KEY,
    'x-api-builderbot': API_KEY,
  };

  try {
    const response = await axios.post(url, body, { headers, timeout: 30000 });
    return response.data;
  } catch (error: any) {
    console.error('🔥 [BuilderBot] Error al enviar:', error?.response?.data || error.message);
    console.error('   URL:', url);
    throw error;
  }
}

