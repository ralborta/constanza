import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

export interface ExtractedPromise {
  dueDate: string;
  amount?: number;
  reason?: string;
}

export interface ExtractedCallback {
  scheduledAt: string;
  reason: string;
  type: 'CALLBACK' | 'FOLLOW_UP';
}

export interface MessageExtraction {
  promises: ExtractedPromise[];
  callbacks: ExtractedCallback[];
}

/**
 * Extrae del texto de un mensaje (WhatsApp/Email) del cliente:
 * - Promesas de pago (fecha, monto) → core.promises
 * - Callbacks / seguimiento (volver a llamar, confirmar tal día) → contact.scheduled_callbacks
 */
export async function extractCallbacksAndPromisesFromMessage(
  messageText: string,
  channel: 'WHATSAPP' | 'EMAIL'
): Promise<MessageExtraction> {
  if (!OPENAI_API_KEY || !messageText || messageText.length < 10) {
    return { promises: [], callbacks: [] };
  }

  const today = new Date().toISOString().slice(0, 10);
  const canal = channel === 'WHATSAPP' ? 'WhatsApp' : 'email';

  const systemPrompt = `Eres un asistente que analiza mensajes de clientes en contexto de cobranza (${canal}) y extrae datos estructurados en JSON.

Reglas:
1. PROMESAS: Si el cliente indica que va a pagar en una fecha (ej. "pago el viernes", "mañana transfiero", "la semana que viene", "para el 15"), extrae:
   - dueDate: fecha en formato YYYY-MM-DD (usa la fecha actual como referencia)
   - amount: monto en centavos solo si se menciona (ej. 50000 = $500), sino omite
   - reason: breve motivo (opcional)

2. CALLBACKS: Si el cliente pide que lo llamen/contacten después, o sugiere una fecha para seguimiento (ej. "llámenme el lunes", "confirmen en 3 días", "hablamos la próxima semana"), extrae:
   - scheduledAt: fecha en formato YYYY-MM-DD o ISO. Para "en X días" suma X a hoy. Para "la próxima semana" usa el lunes siguiente.
   - reason: motivo breve
   - type: "CALLBACK" si pide que lo llamen, "FOLLOW_UP" si es seguimiento de pago/promesa

Responde ÚNICAMENTE con un JSON válido (sin markdown):
{"promises":[{"dueDate":"YYYY-MM-DD","amount":null,"reason":""}],"callbacks":[{"scheduledAt":"YYYY-MM-DD","reason":"","type":"CALLBACK"}]}

Si no hay promesas ni callbacks: {"promises":[],"callbacks":[]}`;

  const userPrompt = `Fecha de hoy: ${today}

Mensaje del cliente (${canal}):
---
${messageText}
---

Devuelve el JSON con promesas y callbacks extraídos.`;

  try {
    const response = await axios.post<{ choices: { message: { content: string } }[] }>(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    if (!content) return { promises: [], callbacks: [] };

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const parsed = JSON.parse(jsonStr) as MessageExtraction;

    const promises: ExtractedPromise[] = Array.isArray(parsed.promises)
      ? parsed.promises.filter((p: any) => p && p.dueDate)
      : [];
    const callbacks: ExtractedCallback[] = Array.isArray(parsed.callbacks)
      ? parsed.callbacks.filter((c: any) => c && c.scheduledAt && c.reason)
      : [];

    return { promises, callbacks };
  } catch (err: any) {
    console.error('[callbacks-from-message] OpenAI extraction error:', err?.response?.data || err.message);
    return { promises: [], callbacks: [] };
  }
}

export async function createCallbacksAndPromisesFromExtraction(
  extraction: MessageExtraction,
  context: {
    tenantId: string;
    customerId: string;
    invoiceId: string | null;
    sourceContactEventId: string | null;
    channel: 'WHATSAPP' | 'EMAIL';
  }
): Promise<{ promisesCreated: number; callbacksCreated: number }> {
  const { tenantId, customerId, invoiceId, sourceContactEventId, channel } = context;
  let promisesCreated = 0;
  let callbacksCreated = 0;

  for (const p of extraction.promises) {
    if (!p.dueDate) continue;
    const dueDate = new Date(p.dueDate);
    if (isNaN(dueDate.getTime())) continue;
    if (!invoiceId) continue;

    try {
      await prisma.promise.create({
        data: {
          tenantId,
          invoiceId,
          dueDate,
          amount: p.amount ?? null,
          channel,
          status: 'PENDIENTE',
          reason: p.reason ?? null,
        },
      });
      promisesCreated++;
    } catch (e) {
      console.error('[callbacks-from-message] Error creating promise:', e);
    }
  }

  for (const c of extraction.callbacks) {
    const scheduledAt = new Date(c.scheduledAt);
    if (isNaN(scheduledAt.getTime())) continue;

    try {
      await prisma.scheduledCallback.create({
        data: {
          tenantId,
          customerId,
          invoiceId,
          sourceContactEventId,
          scheduledAt,
          type: c.type === 'FOLLOW_UP' ? 'FOLLOW_UP' : 'CALLBACK',
          reason: c.reason,
          status: 'PENDING',
        },
      });
      callbacksCreated++;
    } catch (e) {
      console.error('[callbacks-from-message] Error creating scheduled callback:', e);
    }
  }

  return { promisesCreated, callbacksCreated };
}

/**
 * Procesa el texto de un mensaje entrante (WhatsApp o Email), extrae promesas y callbacks
 * y los persiste. Se invoca desde los webhooks de mensajes entrantes.
 */
export async function processMessageForCallbacks(
  messageText: string,
  context: {
    tenantId: string;
    customerId: string;
    invoiceId: string | null;
    sourceContactEventId: string | null;
  },
  channel: 'WHATSAPP' | 'EMAIL'
): Promise<{ promisesCreated: number; callbacksCreated: number }> {
  const skipPatterns = ['[Imagen]', '[Documento]', '[Mensaje de voz]', '[Voice note]'];
  const trimmed = messageText?.trim() || '';
  if (trimmed.length < 10 || skipPatterns.some((p) => trimmed === p)) {
    return { promisesCreated: 0, callbacksCreated: 0 };
  }

  const extraction = await extractCallbacksAndPromisesFromMessage(trimmed, channel);
  return createCallbacksAndPromisesFromExtraction(extraction, {
    ...context,
    channel,
  });
}
