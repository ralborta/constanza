import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendWhatsAppMessage } from '../lib/builderbot.js';

export async function whatsappTestRoutes(server: FastifyInstance) {
  server.post(
    '/wa/test-send',
    async (request, reply) => {
      const bodySchema = z.object({
        number: z.string().min(5),
        message: z.string().min(1),
        mediaUrl: z.string().url().optional(),
      });

      let parsed;
      try {
        parsed = bodySchema.parse(request.body);
      } catch (err: any) {
        return reply.status(400).send({
          error: 'Payload inválido',
          details: err.errors,
        });
      }

      try {
        const result = await sendWhatsAppMessage({
          number: parsed.number,
          message: parsed.message,
          mediaUrl: parsed.mediaUrl,
          checkIfExists: false,
        });

        return reply.send({ ok: true, result });
      } catch (error: any) {
        server.log.error(
          {
            error: error?.response?.data || error.message,
          },
          '[WhatsApp Test Send] Error'
        );
        return reply.status(500).send({
          ok: false,
          error: error?.response?.data || error.message || 'Error enviando el mensaje',
        });
      }
    }
  );
}


