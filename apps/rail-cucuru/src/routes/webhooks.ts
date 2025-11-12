import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const paymentAppliedSchema = z.object({
  payment_id: z.string(),
  applied_at: z.string().datetime(),
  applications: z.array(
    z.object({
      invoice_id: z.string(),
      amount: z.number().int().positive(),
    })
  ),
});

const paymentSettledSchema = z.object({
  payment_id: z.string(),
  settled_at: z.string().datetime(),
  status: z.enum(['LIQUIDADO', 'RECHAZADO']),
});

function verifyHMAC(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // POST /wh/cucuru/payment.applied
  fastify.post('/payment.applied', async (request, reply) => {
    const signature = request.headers['x-cucuru-signature'] as string;
    const body = request.body as any;

    if (!signature) {
      return reply.status(401).send({ error: 'Missing signature' });
    }

    // Verificar HMAC
    const secret = process.env.CUCURU_WEBHOOK_SECRET;
    if (!secret) {
      fastify.log.error('CUCURU_WEBHOOK_SECRET not configured');
      return reply.status(500).send({ error: 'Server configuration error' });
    }

    const payload = JSON.stringify(body);
    const isValid = verifyHMAC(payload, signature, secret);

    if (!isValid) {
      fastify.log.warn({ signature }, 'Invalid HMAC signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Validar payload
    const data = paymentAppliedSchema.parse(body);

    // Idempotencia con Redis
    const eventId = `cucuru:payment.applied:${data.payment_id}`;
    const isDuplicate = await redis.setnx(eventId, '1');
    
    if (!isDuplicate) {
      fastify.log.info({ payment_id: data.payment_id }, 'Duplicate webhook, ignoring');
      return reply.status(200).send({ status: 'duplicate' });
    }

    await redis.expire(eventId, 3600); // 1 hora

    try {
      // TODO: Obtener tenant_id desde el payment_id o desde algún campo del webhook
      // Por ahora asumimos que viene en el body o lo obtenemos de otra forma
      const tenantId = body.tenant_id || 'default-tenant-id'; // Ajustar según tu lógica

      // Buscar o crear payment (externalRef no es único, usamos findFirst + create)
      let payment = await prisma.payment.findFirst({
        where: {
          tenantId,
          externalRef: data.payment_id,
          sourceSystem: 'CUCURU',
        },
      });

      if (!payment) {
        payment = await prisma.payment.create({
          data: {
            tenantId,
            sourceSystem: 'CUCURU',
            method: 'TRANSFERENCIA',
            status: 'APLICADO',
            externalRef: data.payment_id,
          },
        });
      }

      // Crear payment applications
      for (const app of data.applications) {
        await prisma.paymentApplication.create({
          data: {
            tenantId,
            paymentId: payment.id,
            invoiceId: app.invoice_id,
            amount: app.amount,
            isAuthoritative: true,
            appliedAt: new Date(data.applied_at),
            externalApplicationRef: `${data.payment_id}-${app.invoice_id}`,
          },
        });
      }

      fastify.log.info(
        { payment_id: data.payment_id, applications: data.applications.length },
        'Payment applied successfully'
      );

      return reply.status(200).send({ status: 'ok' });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error processing webhook');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // POST /wh/cucuru/payment.settled
  fastify.post('/payment.settled', async (request, reply) => {
    const signature = request.headers['x-cucuru-signature'] as string;
    const body = request.body as any;

    if (!signature) {
      return reply.status(401).send({ error: 'Missing signature' });
    }

    // Verificar HMAC
    const secret = process.env.CUCURU_WEBHOOK_SECRET;
    if (!secret) {
      return reply.status(500).send({ error: 'Server configuration error' });
    }

    const payload = JSON.stringify(body);
    const isValid = verifyHMAC(payload, signature, secret);

    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const data = paymentSettledSchema.parse(body);

    // Idempotencia
    const eventId = `cucuru:payment.settled:${data.payment_id}`;
    const isDuplicate = await redis.setnx(eventId, '1');
    
    if (!isDuplicate) {
      return reply.status(200).send({ status: 'duplicate' });
    }

    await redis.expire(eventId, 3600);

    try {
      // Buscar payment por external_ref
      const payment = await prisma.payment.findFirst({
        where: {
          externalRef: data.payment_id,
        },
      });

      if (!payment) {
        fastify.log.warn({ payment_id: data.payment_id }, 'Payment not found');
        return reply.status(404).send({ error: 'Payment not found' });
      }

      // Actualizar payment
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: data.status === 'LIQUIDADO' ? 'LIQUIDADO' : 'RECHAZADO',
          settledAt: new Date(data.settled_at),
        },
      });

      fastify.log.info(
        { payment_id: data.payment_id, status: data.status },
        'Payment settled'
      );

      return reply.status(200).send({ status: 'ok' });
    } catch (error: any) {
      fastify.log.error({ error: error.message }, 'Error processing webhook');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}

