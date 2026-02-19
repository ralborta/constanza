import axios from 'axios';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1';

export interface OpenAIRespuestaCobranza {
  respuesta: string;
  tokens_usados: number;
  modelo: string;
}

const MAX_REINTENTOS = 3;

/**
 * Llama a OpenAI para generar la respuesta del agente de cobranza.
 */
export async function llamarOpenAICobranza(prompt: string): Promise<OpenAIRespuestaCobranza> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }

  let lastError: Error | null = null;
  for (let intento = 1; intento <= MAX_REINTENTOS; intento++) {
    try {
      const response = await axios.post<{
        choices: { message?: { content?: string }; finish_reason?: string }[];
        usage?: { total_tokens?: number };
        model?: string;
      }>(
        `${OPENAI_API_URL}/chat/completions`,
        {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Eres un agente de cobranza profesional. Responde siempre en español.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.9,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          timeout: 30000,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content?.trim() ?? '';
      const tokensUsados = response.data?.usage?.total_tokens ?? 0;
      const modelo = response.data?.model ?? 'gpt-4o-mini';

      return {
        respuesta: content,
        tokens_usados: tokensUsados,
        modelo,
      };
    } catch (err: any) {
      lastError = err;
      if (intento < MAX_REINTENTOS) {
        await new Promise((r) => setTimeout(r, 1000 * intento));
      }
    }
  }

  throw lastError ?? new Error('OpenAI: error después de reintentos');
}
