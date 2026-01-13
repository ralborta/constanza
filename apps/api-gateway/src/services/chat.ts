import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatContext {
  invoice: {
    id: string;
    numero: string;
    monto: number;
    montoAplicado: number;
    fechaVto: string;
    estado: string;
  };
  customer: {
    id: string;
    razonSocial: string;
    cuits: Array<{ cuit: string; isPrimary: boolean }>;
  };
  timeline: Array<{
    type: string;
    channel?: string;
    direction?: string;
    message?: string;
    status?: string;
    ts: string;
  }>;
  summary?: {
    summary: string;
    keyPoints: string[];
    nextSteps?: string[];
    sentiment?: string;
  };
}

/**
 * Construye el contexto completo de la factura para el chat
 */
export async function buildInvoiceContext(
  invoiceId: string,
  tenantId: string
): Promise<ChatContext> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, tenantId },
    include: {
      customer: {
        include: {
          cuits: true,
        },
      },
      contactEvents: {
        orderBy: { ts: 'asc' },
        take: 50, // Últimos 50 eventos
      },
    },
  });

  if (!invoice) {
    throw new Error('Factura no encontrada');
  }

  // Construir timeline desde contactEvents
  const timeline = invoice.contactEvents.map((event) => ({
    type: 'CONTACT',
    channel: event.channel,
    direction: event.direction,
    message: event.messageText || event.transcription || event.callSummary || null,
    status: event.status,
    ts: event.ts.toISOString(),
  }));

  // Obtener resumen si existe
  let summary;
  try {
    const lastEvent = invoice.contactEvents[invoice.contactEvents.length - 1];
    if (lastEvent?.payload && typeof lastEvent.payload === 'object') {
      const payload = lastEvent.payload as any;
      if (payload.invoiceSummary) {
        summary = payload.invoiceSummary;
      }
    }
  } catch (error) {
    // Si no hay resumen, continuar sin él
  }

  return {
    invoice: {
      id: invoice.id,
      numero: invoice.numero,
      monto: invoice.monto,
      montoAplicado: invoice.montoAplicado,
      fechaVto: invoice.fechaVto.toISOString(),
      estado: invoice.estado,
    },
    customer: {
      id: invoice.customer.id,
      razonSocial: invoice.customer.razonSocial,
      cuits: invoice.customer.cuits.map((c) => ({
        cuit: c.cuit,
        isPrimary: c.isPrimary,
      })),
    },
    timeline,
    summary,
  };
}

/**
 * Genera el prompt del sistema para el chat de cobranzas
 */
function buildSystemPrompt(context: ChatContext): string {
  const primaryCuit = context.customer.cuits.find((c) => c.isPrimary)?.cuit || 'N/A';
  const montoPendiente = context.invoice.monto - context.invoice.montoAplicado;
  const montoPendienteFormatted = (montoPendiente / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
  });

  return `Eres Constanza, un asistente especializado en gestión de cobranzas. Tu función es ayudar a analizar, entender y gestionar la factura #${context.invoice.numero} del cliente ${context.customer.razonSocial} (CUIT: ${primaryCuit}).

INFORMACIÓN DE LA FACTURA:
- Número: ${context.invoice.numero}
- Monto total: ${(context.invoice.monto / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
- Monto aplicado: ${(context.invoice.montoAplicado / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}
- Monto pendiente: ${montoPendienteFormatted}
- Fecha de vencimiento: ${new Date(context.invoice.fechaVto).toLocaleDateString('es-AR')}
- Estado: ${context.invoice.estado}

REGLAS IMPORTANTES:
1. SOLO puedes hablar sobre esta factura específica (#${context.invoice.numero}) y el cliente ${context.customer.razonSocial}.
2. NO puedes responder preguntas sobre otras facturas, otros clientes o temas no relacionados con esta factura.
3. Si te preguntan sobre algo fuera del alcance, debes redirigir cortésmente al tema de esta factura.
4. Debes analizar el historial de interacciones para dar recomendaciones específicas.
5. Puedes sugerir próximos pasos, analizar el estado de la cobranza, y ayudar a entender el contexto.
6. Usa un tono profesional pero amigable.
7. Si hay información que no tienes, dilo claramente.

Tu objetivo es ayudar a gestionar eficientemente esta cobranza específica.`;
}

/**
 * Construye el contexto de conversación para enviar a OpenAI
 */
function buildConversationContext(context: ChatContext): string {
  const lines: string[] = [];
  
  lines.push(`=== INFORMACIÓN DE LA FACTURA ===`);
  lines.push(`Factura #${context.invoice.numero}`);
  lines.push(`Cliente: ${context.customer.razonSocial}`);
  lines.push(`CUIT: ${context.customer.cuits.find((c) => c.isPrimary)?.cuit || 'N/A'}`);
  lines.push(`Monto total: ${(context.invoice.monto / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`);
  lines.push(`Monto aplicado: ${(context.invoice.montoAplicado / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`);
  lines.push(`Monto pendiente: ${((context.invoice.monto - context.invoice.montoAplicado) / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`);
  lines.push(`Fecha de vencimiento: ${new Date(context.invoice.fechaVto).toLocaleDateString('es-AR')}`);
  lines.push(`Estado: ${context.invoice.estado}`);
  lines.push(``);

  if (context.summary) {
    lines.push(`=== RESUMEN INTELIGENTE ===`);
    lines.push(context.summary.summary);
    if (context.summary.keyPoints && context.summary.keyPoints.length > 0) {
      lines.push(``);
      lines.push(`Puntos clave:`);
      context.summary.keyPoints.forEach((point) => {
        lines.push(`- ${point}`);
      });
    }
    if (context.summary.nextSteps && context.summary.nextSteps.length > 0) {
      lines.push(``);
      lines.push(`Próximos pasos sugeridos:`);
      context.summary.nextSteps.forEach((step) => {
        lines.push(`- ${step}`);
      });
    }
    lines.push(``);
  }

  if (context.timeline && context.timeline.length > 0) {
    lines.push(`=== HISTORIAL DE INTERACCIONES ===`);
    context.timeline.forEach((event, index) => {
      const date = new Date(event.ts).toLocaleString('es-AR');
      const channel = event.channel || 'N/A';
      const direction = event.direction === 'INBOUND' ? 'Cliente' : 'Sistema';
      const status = event.status || 'N/A';
      const message = event.message || '[Sin contenido]';
      
      lines.push(`${index + 1}. [${date}] ${direction} (${channel}) [${status}]`);
      if (message && message !== '[Sin contenido]') {
        lines.push(`   Mensaje: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`);
      }
    });
  }

  return lines.join('\n');
}

/**
 * Procesa un mensaje del chat con contexto de factura
 */
export async function processChatMessage(
  invoiceId: string,
  tenantId: string,
  userMessage: string,
  conversationHistory: ChatMessage[] = []
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }

  // Construir contexto de la factura
  const context = await buildInvoiceContext(invoiceId, tenantId);
  const systemPrompt = buildSystemPrompt(context);
  const conversationContext = buildConversationContext(context);

  // Construir mensajes para OpenAI
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'system',
      content: `CONTEXTO ACTUAL DE LA FACTURA:\n\n${conversationContext}\n\nUsa esta información para responder las preguntas del usuario. Recuerda que SOLO puedes hablar sobre esta factura específica.`,
    },
    ...conversationHistory.slice(-10), // Últimos 10 mensajes para mantener contexto
    {
      role: 'user',
      content: userMessage,
    },
  ];

  try {
    const response = await axios.post(
      `${OPENAI_API_URL}/chat/completions`,
      {
        model: 'gpt-4o-mini',
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: 0.7,
        max_tokens: 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const assistantMessage = response.data.choices[0]?.message?.content;
    if (!assistantMessage) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    return assistantMessage;
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `OpenAI API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`
      );
    }
    throw error;
  }
}
