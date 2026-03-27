import axios from 'axios';

const DEFAULT_BUILDERBOT_URLS = ['https://app.builderbot.cloud', 'https://api.builderbot.cloud'];

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
  let BOT_ID =
    (process.env.BUILDERBOT_BOT_ID ||
      process.env.BUILDERBOT_BOTID ||
      process.env.BUILDERBOT_ID ||
      process.env.BOT_ID ||
      process.env.BUILDERBOT_TEST_BOT_ID ||
      '').trim();
  const API_KEY =
    (process.env.BUILDERBOT_API_KEY ||
      process.env.BUILDERBOT_KEY ||
      process.env.BB_API_KEY ||
      process.env.BUILDERBOT_TEST_API_KEY ||
      '').trim();

  // Fallback temporal para pruebas si el BOT_ID no llega por entorno
  if (!BOT_ID) {
    BOT_ID = '5e3f81b5-8f3f-4684-b22c-03567371b6c1';
  }

  if (!BOT_ID || !API_KEY) {
    throw new Error(
      'BuilderBot no configurado: define BUILDERBOT_BOT_ID y BUILDERBOT_API_KEY'
    );
  }

  const baseUrlCandidates = [
    process.env.BUILDERBOT_BASE_URL?.trim(),
    process.env.BUILDERBOT_API_URL?.trim(),
    ...DEFAULT_BUILDERBOT_URLS,
  ]
    .filter((x): x is string => Boolean(x && x.length > 0))
    .map((x) => x.replace(/\/+$/, ''));

  const payloadVariants: Record<string, any>[] = [
    // Variante histórica en este proyecto
    {
      messages: {
        content: message,
        ...(mediaUrl ? { mediaUrl } : {}),
      },
      number,
      checkIfExists,
    },
    // Variante simple usada por algunos ejemplos de Builderbot
    {
      number,
      message,
      checkIfExists,
      ...(mediaUrl ? { mediaUrl } : {}),
    },
    // Variante "messages array"
    {
      number,
      messages: [
        {
          content: message,
          ...(mediaUrl ? { mediaUrl } : {}),
        },
      ],
      checkIfExists,
    },
  ];

  const headerVariants = [
    {
      'Content-Type': 'application/json',
      'x-api-builderbot': API_KEY as string,
    },
    {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY as string,
    },
    {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
  ];

  const errors: string[] = [];
  for (const base of baseUrlCandidates) {
    const url = `${base}/api/v2/${BOT_ID}/messages`;
    for (const headers of headerVariants) {
      for (const body of payloadVariants) {
        try {
          const response = await axios.post(url, body, { headers, timeout: 30000 });
          return response.data;
        } catch (err: any) {
          const status = err?.response?.status;
          const data = err?.response?.data;
          errors.push(
            `${url} status=${status ?? 'n/a'} header=${Object.keys(headers).find((k) =>
              k.toLowerCase().includes('api') || k.toLowerCase() === 'authorization'
            )} bodyKeys=${Object.keys(body).join(',')} detail=${typeof data === 'string' ? data.slice(0, 120) : JSON.stringify(data ?? err?.message).slice(0, 120)}`
          );
        }
      }
    }
  }

  throw new Error(`Builderbot send failed after fallbacks: ${errors.slice(0, 6).join(' | ')}`);
}


