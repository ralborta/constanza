import { sendWhatsAppMessage } from '../lib/builderbot.js';

interface SendWhatsAppParams {
  to: string;
  message: string;
  templateId?: string; // Ignorado por ahora (no usamos templates en API v2 de pruebas)
  variables?: Record<string, string>; // Ignorado por ahora
}

/**
 * Envío de WhatsApp UNO a UNO usando BuilderBot Cloud (API v2)
 * - Usado por el worker normal (no batch).
 * - Requiere env vars: BUILDERBOT_API_KEY y BUILDERBOT_BOT_ID
 */
export async function sendWhatsApp({ to, message }: SendWhatsAppParams) {
  // Validación en tiempo de ejecución (evita valores stale de import-time)
  const hasKey = !!process.env.BUILDERBOT_API_KEY;
  const hasBot = !!process.env.BUILDERBOT_BOT_ID;
  if (!hasKey || !hasBot) {
    // Dejar que el cliente lance un error más claro y homogéneo
    throw new Error('BUILDERBOT_API_KEY not configured');
  }

  // Normalizar número (quitar espacios y guiones)
  const number = (to || '').replace(/\s|-/g, '');

  const result = await sendWhatsAppMessage({
    number,
    message,
    checkIfExists: false,
  });

  // Intentar mapear un id estándar
  const messageId =
    result?.id ||
    result?.messageId ||
    result?.message?.id ||
    result?.data?.id ||
    '';

  return {
    messageId,
    status: 'QUEUED',
  };
}

