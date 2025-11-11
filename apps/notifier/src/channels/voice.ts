import axios from 'axios';

const ELEVENLABS_API_URL = process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io';
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

interface SendVoiceParams {
  to: string;
  script: string;
  agentId?: string;
  variables?: Record<string, string>;
}

export async function sendVoice({ to, script, agentId, variables }: SendVoiceParams) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  if (!agentId) {
    agentId = process.env.ELEVENLABS_AGENT_ID;
  }

  if (!agentId) {
    throw new Error('ELEVENLABS_AGENT_ID not configured');
  }

  // Iniciar llamada con ElevenLabs Agent
  // Nota: Esto es una implementación básica, ajustar según API real de ElevenLabs
  const response = await axios.post(
    `${ELEVENLABS_API_URL}/v1/agents/${agentId}/calls`,
    {
      to,
      script,
      variables,
    },
    {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    callId: response.data.call_id,
    status: response.data.status,
  };
}

