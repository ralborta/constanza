import axios from 'axios';

const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const ELEVENLABS_PHONE_NUMBER_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID;

interface SendVoiceParams {
  to: string;
  script: string;
  agentId?: string;
  variables?: Record<string, string>;
}

/**
 * Formatea número de teléfono para ElevenLabs (formato E.164)
 */
function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Eliminar espacios, guiones y paréntesis
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Asegurar que empiece con +
  if (!cleaned.startsWith('+')) {
    // Si empieza con 54 (Argentina), agregar +
    if (cleaned.startsWith('54')) {
      cleaned = '+' + cleaned;
    } else {
      // Si no tiene código de país, asumir Argentina
      cleaned = '+54' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Envía una llamada individual usando ElevenLabs ConvAI
 */
export async function sendVoice({ to, script, agentId, variables }: SendVoiceParams) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const finalAgentId = agentId || ELEVENLABS_AGENT_ID;
  if (!finalAgentId) {
    throw new Error('ELEVENLABS_AGENT_ID not configured');
  }

  if (!ELEVENLABS_PHONE_NUMBER_ID) {
    throw new Error('ELEVENLABS_PHONE_NUMBER_ID not configured');
  }

  const phoneNumber = formatPhoneNumber(to);
  
  // Usar ElevenLabs ConvAI para iniciar una conversación
  // Para llamadas individuales, usamos el endpoint de conversaciones
  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/v1/convai/conversations`,
      {
        agent_id: finalAgentId,
        agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
        phone_number: phoneNumber,
        conversation_initiation_client_data: {
          type: 'conversation_initiation_client_data',
          dynamic_variables: variables || {},
        },
      },
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      callId: response.data.conversation_id || response.data.id,
      status: response.data.status || 'initiated',
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `ElevenLabs API Error: ${error.response.status} - ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`
      );
    }
    throw error;
  }
}

/**
 * Ejecuta un batch de llamadas usando ElevenLabs Batch Calling API
 */
export async function executeBatchCall(
  contacts: Array<{
    phone_number: string;
    variables?: Record<string, string>;
  }>,
  batchId: string,
  callName?: string
) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  if (!ELEVENLABS_AGENT_ID) {
    throw new Error('ELEVENLABS_AGENT_ID not configured');
  }

  if (!ELEVENLABS_PHONE_NUMBER_ID) {
    throw new Error('ELEVENLABS_PHONE_NUMBER_ID not configured');
  }

  // Preparar contactos para ElevenLabs
  const recipients = contacts.map((contact) => ({
    phone_number: formatPhoneNumber(contact.phone_number),
    conversation_initiation_client_data: {
      type: 'conversation_initiation_client_data',
      dynamic_variables: contact.variables || {},
    },
  }));

  const requestBody = {
    call_name: callName || `Batch ${batchId}`,
    agent_id: ELEVENLABS_AGENT_ID,
    agent_phone_number_id: ELEVENLABS_PHONE_NUMBER_ID,
    scheduled_time_unix: Math.floor(Date.now() / 1000),
    recipients,
  };

  try {
    const response = await axios.post(
      `${ELEVENLABS_API_URL}/v1/convai/batch-calling/submit`,
      requestBody,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      batchId: response.data.batch_id || response.data.id,
      calls: response.data.calls || [],
      status: response.data.status || 'submitted',
    };
  } catch (error: any) {
    if (error.response) {
      throw new Error(
        `ElevenLabs Batch API Error: ${error.response.status} - ${error.response.data?.detail || error.response.data?.message || 'Unknown error'}`
      );
    }
    throw error;
  }
}

