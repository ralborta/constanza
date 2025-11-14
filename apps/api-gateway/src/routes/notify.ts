import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requirePerfil } from '../middleware/auth.js';
import axios from 'axios';

const NOTIFIER_URL = process.env.NOTIFIER_URL || 'http://localhost:3001';

const sendMessageSchema = z.object({
  customerIds: z.array(z.string().uuid()),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'VOICE']),
  message: z.object({
    text: z.string().optional(),
    body: z.string().optional(),
    subject: z.string().optional(), // Solo para EMAIL
  }),
  templateId: z.string().uuid().optional(),
  variables: z.record(z.string()).optional(),
  invoiceId: z.string().uuid().optional(),
});

export async function notifyRoutes(fastify: FastifyInstance) {
  // POST /notify/batch - Enviar mensajes a múltiples clientes
  fastify.post(
    '/notify/batch',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = sendMessageSchema.parse(request.body);

      try {
        // Verificar que todos los clientes existan y pertenezcan al tenant
        const customers = await prisma.customer.findMany({
          where: {
            id: { in: body.customerIds },
            tenantId: user.tenant_id,
            activo: true,
          },
        });

        if (customers.length !== body.customerIds.length) {
          const foundIds = customers.map((c) => c.id);
          const missingIds = body.customerIds.filter((id) => !foundIds.includes(id));
          return reply.status(400).send({
            error: 'Algunos clientes no existen o no pertenecen a tu tenant',
            missingIds,
          });
        }

        // Validar que los clientes tengan los datos necesarios según el canal
        if (body.channel === 'EMAIL') {
          const withoutEmail = customers.filter((c) => !c.email);
          if (withoutEmail.length > 0) {
            return reply.status(400).send({
              error: 'Algunos clientes no tienen email configurado',
              customerIds: withoutEmail.map((c) => c.id),
            });
          }
        }

        if (body.channel === 'WHATSAPP' || body.channel === 'VOICE') {
          const withoutPhone = customers.filter((c) => !c.telefono);
          if (withoutPhone.length > 0) {
            return reply.status(400).send({
              error: 'Algunos clientes no tienen teléfono configurado',
              customerIds: withoutPhone.map((c) => c.id),
            });
          }
        }

        // Crear batch job para tracking
        const batchJob = await prisma.batchJob.create({
          data: {
            tenantId: user.tenant_id,
            createdBy: user.user_id || '', // user_id viene del JWT
            channel: body.channel,
            status: 'PROCESSING',
            totalMessages: customers.length,
            processed: 0,
            failed: 0,
          },
        });

        // Enviar cada mensaje al notifier (se procesarán uno por uno en cola)
        const jobs = [];
        for (const customer of customers) {
          try {
            const response = await axios.post(
              `${NOTIFIER_URL}/notify/send`,
              {
                channel: body.channel,
                customerId: customer.id,
                invoiceId: body.invoiceId,
                message: body.message,
                templateId: body.templateId,
                variables: body.variables,
                batchId: batchJob.id,
                tenantId: user.tenant_id,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );
            jobs.push({ customerId: customer.id, jobId: response.data.jobId });
          } catch (error: any) {
            fastify.log.error(
              { customerId: customer.id, error: error.message },
              'Error queuing message'
            );
            // Continuar con los demás
          }
        }

        fastify.log.info(
          { batchId: batchJob.id, total: customers.length, jobs: jobs.length },
          'Batch notification queued'
        );

        return {
          batchId: batchJob.id,
          totalMessages: customers.length,
          queued: jobs.length,
          status: 'PROCESSING',
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Invalid payload', details: error.issues });
        }

        fastify.log.error({ error: error.message }, 'Error creating batch notification');
        return reply.status(500).send({ error: 'Error al crear batch de notificaciones' });
      }
    }
  );

  // GET /notify/batch/:id - Estado de un batch
  fastify.get(
    '/notify/batch/:id',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1', 'OPERADOR_2'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      const batchJob = await prisma.batchJob.findFirst({
        where: {
          id,
          tenantId: user.tenant_id,
        },
      });

      if (!batchJob) {
        return reply.status(404).send({ error: 'Batch no encontrado' });
      }

      return {
        batch: {
          id: batchJob.id,
          channel: batchJob.channel,
          status: batchJob.status,
          totalMessages: batchJob.totalMessages,
          processedMessages: batchJob.processed,
          failedMessages: batchJob.failed,
          createdAt: batchJob.createdAt,
          updatedAt: batchJob.updatedAt,
        },
      };
    }
  );

  // POST /notify/send - Enviar mensaje a un solo cliente (wrapper del notifier)
  fastify.post(
    '/notify/send',
    {
      preHandler: [authenticate, requirePerfil(['ADM', 'OPERADOR_1'])],
    },
    async (request, reply) => {
      const user = request.user!;
      const body = z
        .object({
          customerId: z.string().uuid(),
          channel: z.enum(['EMAIL', 'WHATSAPP', 'VOICE']),
          message: z.object({
            text: z.string().optional(),
            body: z.string().optional(),
            subject: z.string().optional(),
          }),
          templateId: z.string().uuid().optional(),
          variables: z.record(z.string()).optional(),
          invoiceId: z.string().uuid().optional(),
        })
        .parse(request.body);

      // Verificar que el cliente existe y pertenece al tenant
      const customer = await prisma.customer.findFirst({
        where: {
          id: body.customerId,
          tenantId: user.tenant_id,
          activo: true,
        },
      });

      if (!customer) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }

      // Validar datos según canal
      if (body.channel === 'EMAIL' && !customer.email) {
        return reply.status(400).send({ error: 'Cliente no tiene email configurado' });
      }

      if ((body.channel === 'WHATSAPP' || body.channel === 'VOICE') && !customer.telefono) {
        return reply.status(400).send({ error: 'Cliente no tiene teléfono configurado' });
      }

      try {
        const response = await axios.post(
          `${NOTIFIER_URL}/notify/send`,
          {
            channel: body.channel,
            customerId: body.customerId,
            invoiceId: body.invoiceId,
            message: body.message,
            templateId: body.templateId,
            variables: body.variables,
            tenantId: user.tenant_id,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        return {
          jobId: response.data.jobId,
          status: 'queued',
        };
      } catch (error: any) {
        fastify.log.error({ error: error.message }, 'Error sending notification');
        return reply.status(500).send({
          error: 'Error al enviar notificación',
          details: error.response?.data || error.message,
        });
      }
    }
  );
}

