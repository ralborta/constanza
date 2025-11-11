import axios from 'axios';

const BUILDERBOT_API_URL = process.env.BUILDERBOT_API_URL || 'https://api.builderbot.cloud';
const BUILDERBOT_API_KEY = process.env.BUILDERBOT_API_KEY;

interface SendWhatsAppParams {
  to: string;
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

export async function sendWhatsApp({ to, message, templateId, variables }: SendWhatsAppParams) {
  if (!BUILDERBOT_API_KEY) {
    throw new Error('BUILDERBOT_API_KEY not configured');
  }

  // Si hay templateId, usar template
  if (templateId) {
    const response = await axios.post(
      `${BUILDERBOT_API_URL}/v1/messages`,
      {
        to,
        templateId,
        variables,
      },
      {
        headers: {
          Authorization: `Bearer ${BUILDERBOT_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      messageId: response.data.id,
      status: response.data.status,
    };
  }

  // Mensaje simple
  const response = await axios.post(
    `${BUILDERBOT_API_URL}/v1/messages`,
    {
      to,
      message,
    },
    {
      headers: {
        Authorization: `Bearer ${BUILDERBOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return {
    messageId: response.data.id,
    status: response.data.status,
  };
}

