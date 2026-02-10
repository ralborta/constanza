import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

export interface ExtractedPromise {
  dueDate: string; // YYYY-MM-DD
  amount?: number; // centavos, opcional
  reason?: string;
}

export interface ExtractedCallback {
  scheduledAt: string; // ISO datetime o YYYY-MM-DD
  reason: string;
  type: 'CALLBACK' | 'FOLLOW_UP';
}

export interface CallSummaryExtraction {
  promises: ExtractedPromise[];
  callbacks: ExtractedCallback[];
}

/**
 * Usa OpenAI para extraer del resumen de la llamada:
 * - Promesas de pago (fecha, monto opcional) → se crearán en core.promises
 * - Callbacks / seguimiento (fecha/hora de próxima llamada) → se crearán en contact.scheduled_callbacks
 */
export async function extractCallbacksAndPromisesFromSummary(
  callSummary: string,
  _options?: { transcript?: string }
): Promise<CallSummaryExtraction> {
  if (!OPENAI_API_KEY) {
    return { promises: [], callbacks: [] };
  }

  const today = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Eres un asistente que analiza resúmenes de llamadas de cobranza y extrae datos estructurados en JSON.

Reglas:
1. PROMESAS: Si el cliente prometió pagar en una fecha (ej. "pago el viernes", "transferencia mañana", "la semana que viene"), extrae:
   - dueDate: fecha en formato YYYY-MM-DD (usa la fecha actual como referencia si no hay año)
   - amount: monto en centavos solo si se menciona explícitamente (ej. 50000 = $500), sino omite
   - reason: breve motivo (opcional)

2. CALLBACKS / CRONOGRAMA: Si se acordó volver a llamar, hacer seguimiento, o hay una fecha sugerida para contactar de nuevo (ej. "llamar la próxima semana", "volver a llamar en 3 días", "confirmar el pago el lunes"), extrae:
   - scheduledAt: fecha/hora en formato ISO (YYYY-MM-DD o YYYY-MM-DDTHH:MM:00). Para "en X días" suma X a la fecha actual. Para "la próxima semana" usa el lunes siguiente.
   - reason: motivo breve
   - type: "CALLBACK" si es volver a llamar al cliente, "FOLLOW_UP" si es seguimiento de pago/promesa

Responde ÚNICAMENTE con un JSON válido (sin markdown) con esta estructura:
{"promises":[{"dueDate":"YYYY-MM-DD","amount":null,"reason":""}],"callbacks":[{"scheduledAt":"YYYY-MM-DD o ISO","reason":"","type":"CALLBACK"}]}

Si no hay promesas ni callbacks, devuelve: {"promises":[],"callbacks":[]}`;

  const userPrompt = `Fecha de hoy (referencia): ${today}

Resumen de la llamada:
---
${callSummary}
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

    // Limpiar posible markdown (```json ... ```)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();
    const parsed = JSON.parse(jsonStr) as CallSummaryExtraction;

    const promises: ExtractedPromise[] = Array.isArray(parsed.promises)
      ? parsed.promises.filter((p: any) => p && p.dueDate)
      : [];
    const callbacks: ExtractedCallback[] = Array.isArray(parsed.callbacks)
      ? parsed.callbacks.filter((c: any) => c && c.scheduledAt && c.reason)
      : [];

    return { promises, callbacks };
  } catch (err: any) {
    console.error('[callbacks-from-summary] OpenAI extraction error:', err?.response?.data || err.message);
    return { promises: [], callbacks: [] };
  }
}

/**
 * Crea en BD las promesas y callbacks extraídos del resumen, asociados al contacto/factura de la llamada.
 */
export async function createCallbacksAndPromisesFromExtraction(
  extraction: CallSummaryExtraction,
  context: {
    tenantId: string;
    customerId: string;
    invoiceId: string | null;
    sourceContactEventId: string | null;
  }
): Promise<{ promisesCreated: number; callbacksCreated: number }> {
  const { tenantId, customerId, invoiceId, sourceContactEventId } = context;
  let promisesCreated = 0;
  let callbacksCreated = 0;

  for (const p of extraction.promises) {
    if (!p.dueDate) continue;
    const dueDate = new Date(p.dueDate);
    if (isNaN(dueDate.getTime())) continue;
    if (!invoiceId) continue; // promesas van por factura

    try {
      await prisma.promise.create({
        data: {
          tenantId,
          invoiceId,
          dueDate,
          amount: p.amount ?? null,
          channel: 'VOICE',
          status: 'PENDIENTE',
          reason: p.reason ?? null,
        },
      });
      promisesCreated++;
    } catch (e) {
      console.error('[callbacks-from-summary] Error creating promise:', e);
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
      console.error('[callbacks-from-summary] Error creating scheduled callback:', e);
    }
  }

  return { promisesCreated, callbacksCreated };
}

/**
 * Flujo completo: dado el resumen de una llamada y el contexto, extrae promesas y callbacks
 * y los persiste. Se invoca desde el webhook de ElevenLabs después de actualizar el ContactEvent.
 */
export async function processCallSummaryForCallbacks(
  callSummary: string,
  context: {
    tenantId: string;
    customerId: string;
    invoiceId: string | null;
    sourceContactEventId: string | null;
  }
): Promise<{ promisesCreated: number; callbacksCreated: number }> {
  const extraction = await extractCallbacksAndPromisesFromSummary(callSummary);
  return createCallbacksAndPromisesFromExtraction(extraction, context);
}
