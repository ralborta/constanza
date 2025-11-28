import axios from 'axios';

// URL completa provista por BuilderBot (copiada del panel) – sin construir a mano
const BUILDERBOT_MESSAGES_URL = (process.env.BUILDERBOT_MESSAGES_URL || '').trim();

export interface SendWhatsAppOptions {
  number: string; // número en formato internacional
  message: string; // contenido del mensaje
  mediaUrl?: string; // opcional
  checkIfExists?: boolean; // no usado aquí
}

/**
 * Envía UN mensaje de WhatsApp vía BuilderBot usando la URL completa del panel.
 * - Un único destinatario por llamada (sin batch).
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions) {
  const { number, message, mediaUrl } = options;

  const API_KEY =
    (process.env.BUILDERBOT_API_KEY ||
      process.env.BUILDERBOT_KEY ||
      process.env.BB_API_KEY ||
      '').trim();

  if (!BUILDERBOT_MESSAGES_URL) {
    throw new Error('BUILDERBOT_MESSAGES_URL no configurada');
  }
  if (!API_KEY) {
    throw new Error('BUILDERBOT_API_KEY no configurada');
  }

  const body: Record<string, any> = { number, message };
  if (mediaUrl) body.media = mediaUrl;

  const headers = {
    'Content-Type': 'application/json',
    'api-key': API_KEY,
    'x-api-builderbot': API_KEY,
  };

  try {
    const response = await axios.post(BUILDERBOT_MESSAGES_URL, body, { headers, timeout: 30000 });
    return response.data;
  } catch (error: any) {
    console.error('🔥 [BuilderBot] Error al enviar:', error?.response?.data || error.message);
    console.error('   URL:', BUILDERBOT_MESSAGES_URL);
    throw error;
  }
}

