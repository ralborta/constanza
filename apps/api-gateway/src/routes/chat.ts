import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import { processChatMessage } from '../services/chat.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChatRequest {
  message: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export async function chatRoutes(fastify: FastifyInstance) {
  // POST /v1/invoices/:id/chat - Enviar mensaje al chat de la factura
  fastify.post(
    '/invoices/:id/chat',
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user.tenant_id;
      const { message, conversationHistory = [] } = request.body as ChatRequest;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return reply.status(400).send({
          error: 'El mensaje es requerido y no puede estar vacío',
        });
      }

      try {
        // Verificar que la factura existe y pertenece al tenant
        const invoice = await prisma.invoice.findFirst({
          where: { id, tenantId },
        });

        if (!invoice) {
          return reply.status(404).send({
            error: 'Factura no encontrada',
          });
        }

        // Procesar el mensaje con IA
        const response = await processChatMessage(
          id,
          tenantId,
          message.trim(),
          conversationHistory
        );

        fastify.log.info(
          { invoiceId: id, tenantId, messageLength: message.length },
          'Chat message processed successfully'
        );

        return reply.status(200).send({
          invoiceId: id,
          message: response,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        fastify.log.error(
          { error: error.message, stack: error.stack, invoiceId: id, tenantId },
          'Error processing chat message'
        );
        return reply.status(500).send({
          error: 'Error procesando mensaje del chat',
          message: error.message,
        });
      }
    }
  );
}
