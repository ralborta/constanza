import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

interface TimelineEvent {
  id: string;
  channel: string;
  direction: string;
  messageText: string | null;
  transcription: string | null;
  callSummary: string | null;
  status: string;
  ts: Date;
  payload: any;
}

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  nextSteps?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * Genera un resumen inteligente de las interacciones de una factura
 * 
 * IMPORTANTE: Incluye TODAS las interacciones (inbound y outbound):
 * - Mensajes enviados (outbound): Email, WhatsApp, Voice
 * - Mensajes recibidos (inbound): Respuestas del cliente por cualquier canal
 * - Llamadas salientes y entrantes
 * - Promesas de pago
 * - Cualquier otro evento relacionado con la factura
 * 
 * El resumen es ÚNICO y consolidado, considerando todo el historial completo.
 */
export async function generateInvoiceSummary(
  invoiceId: string,
  tenantId: string
): Promise<SummaryResult> {
  // Obtener TODOS los eventos relacionados con la factura (inbound y outbound)
  // Sin filtrar por dirección - incluye todo el historial completo
  const events = await prisma.contactEvent.findMany({
    where: {
      invoiceId,
      tenantId,
      // NO filtramos por direction - queremos TODAS las interacciones
    },
    orderBy: {
      ts: 'asc', // Orden cronológico para construir la conversación completa
    },
  });

  console.log(`[Summarization] Encontrados ${events.length} eventos para factura ${invoiceId}`);

  if (events.length === 0) {
    return {
      summary: 'No hay interacciones registradas para esta factura.',
      keyPoints: [],
    };
  }

  // Construir contexto de la conversación
  const conversationContext = buildConversationContext(events);
  console.log(`[Summarization] Contexto construido: ${conversationContext.length} caracteres`);

  // Generar resumen con OpenAI
  const summary = await generateSummaryWithOpenAI(conversationContext, 'invoice');
  console.log(`[Summarization] Resumen generado: ${summary.summary.length} caracteres`);

  return summary;
}

/**
 * Genera un resumen inteligente de las interacciones de un cliente
 * 
 * IMPORTANTE: Incluye TODAS las interacciones (inbound y outbound):
 * - Mensajes enviados y recibidos por todos los canales
 * - Llamadas salientes y entrantes
 * - Interacciones relacionadas con todas las facturas del cliente
 * 
 * El resumen es ÚNICO y consolidado, considerando todo el historial reciente.
 */
export async function generateCustomerSummary(
  customerId: string,
  tenantId: string
): Promise<SummaryResult> {
  // Obtener TODOS los eventos relacionados con el cliente (últimos 90 días)
  // Sin filtrar por dirección - incluye todo el historial completo
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const events = await prisma.contactEvent.findMany({
    where: {
      customerId,
      tenantId,
      ts: {
        gte: ninetyDaysAgo,
      },
      // NO filtramos por direction - queremos TODAS las interacciones
    },
    orderBy: {
      ts: 'asc', // Orden cronológico para construir la conversación completa
    },
    take: 100, // Limitar a los últimos 100 eventos para mantener el contexto manejable
  });

  if (events.length === 0) {
    return {
      summary: 'No hay interacciones registradas para este cliente en los últimos 90 días.',
      keyPoints: [],
    };
  }

  // Construir contexto de la conversación
  const conversationContext = buildConversationContext(events);

  // Generar resumen con OpenAI
  const summary = await generateSummaryWithOpenAI(conversationContext, 'customer');

  return summary;
}

/**
 * Construye el contexto de conversación a partir de TODOS los eventos
 * 
 * Incluye tanto interacciones inbound (del cliente) como outbound (del sistema),
 * construyendo una línea de tiempo completa de la conversación.
 */
function buildConversationContext(events: TimelineEvent[]): string {
  const lines: string[] = [];

  events.forEach((event) => {
    const date = new Date(event.ts).toLocaleString('es-AR');
    const channel = event.channel;
    // Identificar si es inbound (cliente) o outbound (sistema)
    const direction = event.direction === 'INBOUND' ? 'Cliente' : 'Sistema';

    let content = '';
    if (event.messageText) {
      content = event.messageText;
    } else if (event.transcription) {
      content = `[Transcripción de llamada]: ${event.transcription}`;
    } else if (event.callSummary) {
      content = `[Resumen de llamada]: ${event.callSummary}`;
    } else {
      content = '[Sin contenido de texto]';
    }

    const status = event.status;
    // Construir línea con: fecha, dirección (cliente/sistema), canal, estado y contenido
    lines.push(`[${date}] ${direction} (${channel}) [${status}]: ${content}`);
  });

  // Retornar contexto completo ordenado cronológicamente
  return lines.join('\n\n');
}

/**
 * Genera el resumen usando OpenAI API
 */
async function generateSummaryWithOpenAI(
  conversationContext: string,
  type: 'invoice' | 'customer'
): Promise<SummaryResult> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }

  const systemPrompt =
    type === 'invoice'
      ? `Eres un asistente experto en análisis de conversaciones comerciales. 
Analiza el historial de interacciones de una factura y genera un resumen claro y conciso en español.
El resumen debe incluir:
- Cuántas veces se contactó al cliente
- Si el cliente respondió o no
- Qué informó el cliente (pagos, promesas, consultas, reclamos)
- En qué estado se encuentra la conversación
- Próximos pasos sugeridos si aplica

Sé específico y usa datos concretos del historial.`
      : `Eres un asistente experto en análisis de relaciones comerciales.
Analiza el historial de interacciones de un cliente y genera un resumen claro y conciso en español.
El resumen debe incluir:
- Resumen de todas las interacciones recientes
- Patrones de comunicación (canal preferido, frecuencia)
- Estado general de la relación
- Facturas mencionadas o relacionadas
- Próximos pasos sugeridos si aplica

Sé específico y usa datos concretos del historial.`;

  const userPrompt = `Analiza el siguiente historial de interacciones y genera un resumen:

${conversationContext}

Genera un resumen en formato JSON con las siguientes claves:
- summary: texto del resumen (máximo 500 palabras)
- keyPoints: array de puntos clave (máximo 5)
- nextSteps: array de próximos pasos sugeridos (opcional, máximo 3)
- sentiment: "positive", "negative" o "neutral"`;

  try {
    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: 'gpt-4o-mini', // Modelo más económico pero efectivo
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3, // Más determinístico
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 segundos
      }
    );

    const content = response.data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary || 'No se pudo generar el resumen.',
      keyPoints: parsed.keyPoints || [],
      nextSteps: parsed.nextSteps || [],
      sentiment: parsed.sentiment || 'neutral',
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `OpenAI API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`
      );
    }
    throw error;
  }
}

/**
 * Actualiza el resumen de una factura (guarda en el payload del último evento o crea un registro)
 */
export async function updateInvoiceSummary(invoiceId: string, tenantId: string): Promise<void> {
  const summary = await generateInvoiceSummary(invoiceId, tenantId);

  // Por ahora, guardamos el resumen en el último evento de la factura
  // TODO: Podríamos crear una tabla dedicada para resúmenes
  const lastEvent = await prisma.contactEvent.findFirst({
    where: {
      invoiceId,
      tenantId,
    },
    orderBy: {
      ts: 'desc',
    },
  });

  if (lastEvent) {
    const currentPayload = (lastEvent.payload as any) || {};
    await prisma.contactEvent.update({
      where: { id: lastEvent.id },
      data: {
        payload: {
          ...currentPayload,
          invoiceSummary: summary,
          summaryUpdatedAt: new Date().toISOString(),
        },
      },
    });
  }
}

/**
 * Actualiza el resumen de un cliente
 */
export async function updateCustomerSummary(customerId: string, tenantId: string): Promise<void> {
  const summary = await generateCustomerSummary(customerId, tenantId);

  // Guardamos el resumen en el último evento del cliente
  const lastEvent = await prisma.contactEvent.findFirst({
    where: {
      customerId,
      tenantId,
    },
    orderBy: {
      ts: 'desc',
    },
  });

  if (lastEvent) {
    const currentPayload = (lastEvent.payload as any) || {};
    await prisma.contactEvent.update({
      where: { id: lastEvent.id },
      data: {
        payload: {
          ...currentPayload,
          customerSummary: summary,
          summaryUpdatedAt: new Date().toISOString(),
        },
      },
    });
  }
}
