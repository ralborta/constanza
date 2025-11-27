import { sendWhatsAppMessage } from '../../lib/builderbot.js';

interface SendWhatsAppParams {
  to: string;
  message: string;
  templateId?: string; // Ignorado por ahora (no usamos templates en API v2 de pruebas)
  variables?: Record<string, string>; // Ignorado por ahora
}

/**
 * Envío de WhatsApp UNO a UNO usando BuilderBot Cloud (API v2)
 */
export async function sendWhatsApp({ to, message }: SendWhatsAppParams) {
  // Normalizar número (quitar espacios y guiones)
  let number = (to || '').replace(/[\s\-()+]/g, '');
  if (number.startsWith('+')) number = number.slice(1);

  // Delegar validación y resolución de env vars al cliente HTTP
  const result = await sendWhatsAppMessage({
    number,
    message,
    checkIfExists: true,
  });

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


