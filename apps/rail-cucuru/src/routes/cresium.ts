import { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

const prisma = new PrismaClient();

const REPLAY_WINDOW_MS = 6 * 60 * 1000;

function verifyCresiumSignature(opts: {
  timestamp: string;
  method: string;
  pathWithQuery: string;
  rawBody: string;
  signatureB64: string;
  secret: string;
}): boolean {
  const data = `${opts.timestamp}|${opts.method}|${opts.pathWithQuery}|${opts.rawBody}`;
  const expected = crypto.createHmac('sha256', opts.secret).update(data).digest('base64');
  try {
    const sigBuf = Buffer.from(opts.signatureB64, 'base64');
    const expBuf = Buffer.from(expected, 'base64');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

function collectStrings(value: unknown, depth: number, out: Set<string>): void {
  if (depth > 10 || out.size > 250) return;
  if (typeof value === 'string') {
    const t = value.trim();
    if (t.length >= 3) out.add(t);
    return;
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value)) {
      for (const v of value) collectStrings(v, depth + 1, out);
    } else {
      for (const v of Object.values(value as Record<string, unknown>)) {
        collectStrings(v, depth + 1, out);
      }
    }
  }
}

function parseAmountCents(body: Record<string, unknown>): number | null {
  const raw =
    body.totalAmount ??
    body.amount ??
    body.total_amount ??
    body.value ??
    (body.data as Record<string, unknown> | undefined)?.totalAmount;

  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;

  const asCents = process.env.CRESIUM_AMOUNT_UNIT === 'CENTS';
  if (asCents) return Math.round(n);

  // Por defecto: unidades de moneda → centavos
  return Math.round(n * 100);
}

function depositSuccess(body: Record<string, unknown>): boolean {
  const s = String(body.status ?? body.state ?? '').toUpperCase();
  if (!s) return true;
  return ['SUCCESS', 'COMPLETED', 'CONFIRMED', 'APPROVED', 'ACCREDITED', 'SETTLED'].includes(s);
}

function externalKey(body: Record<string, unknown>): string {
  const ext = body.externalId ?? body.external_id;
  if (typeof ext === 'string' && ext.length > 0) return ext;
  const id = body.id;
  if (id != null) return String(id);
  return crypto.randomUUID();
}

async function findInvoiceMatch(
  tenantId: string,
  body: Record<string, unknown>
): Promise<{ id: string; numero: string } | null> {
  const bag = new Set<string>();
  collectStrings(body, 0, bag);
  const strings = [...bag];

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      estado: { in: ['ABIERTA', 'VENCIDA', 'PARCIAL'] },
    },
    select: { id: true, numero: true },
  });

  if (invoices.length === 0) return null;

  invoices.sort((a, b) => b.numero.length - a.numero.length);

  for (const inv of invoices) {
    const n = inv.numero.trim();
    if (n.length < 1) continue;
    const nl = n.toLowerCase();
    for (const str of strings) {
      const sl = str.toLowerCase();
      if (sl.includes(nl)) return inv;
    }
  }
  return null;
}

/**
 * Webhook Depósito Cresium (misma convención de firma que la API partner: x-timestamp, x-signature, HMAC-SHA256 Base64).
 * Requiere cuerpo crudo para validar la firma.
 */
export async function cresiumDepositPlugin(fastify: FastifyInstance) {
  fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    (req as FastifyRequest & { rawBody: string }).rawBody = typeof body === 'string' ? body : String(body);
    try {
      const json = JSON.parse((req as FastifyRequest & { rawBody: string }).rawBody);
      done(null, json);
    } catch (e: unknown) {
      const err = e as Error & { statusCode?: number };
      err.statusCode = 400;
      done(err, undefined);
    }
  });

  fastify.post('/deposito', async (request, reply) => {
    const redis = (fastify as any).redis as Redis | null;

    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody ?? '';
    const body = request.body as Record<string, unknown>;

    const skipVerify = process.env.CRESIUM_SKIP_SIGNATURE_VERIFY === 'true';
    const secret = process.env.CRESIUM_PARTNER_SECRET ?? '';
    const tenantId = process.env.CRESIUM_TENANT_ID ?? '';

    if (!tenantId) {
      fastify.log.error('CRESIUM_TENANT_ID not configured');
      return reply.status(500).send({ error: 'Server configuration error' });
    }

    const expectedCompany = process.env.CRESIUM_COMPANY_ID;
    if (expectedCompany) {
      const cid = request.headers['x-company-id'] as string | undefined;
      if (!cid || String(cid) !== String(expectedCompany)) {
        fastify.log.warn({ cid }, 'Cresium webhook: x-company-id mismatch');
        return reply.status(403).send({ error: 'Invalid company' });
      }
    }

    if (!skipVerify) {
      if (!secret) {
        fastify.log.error('CRESIUM_PARTNER_SECRET not configured');
        return reply.status(500).send({ error: 'Server configuration error' });
      }
      const timestamp = request.headers['x-timestamp'] as string | undefined;
      const signature = request.headers['x-signature'] as string | undefined;
      if (!timestamp || !signature) {
        return reply.status(401).send({ error: 'Missing x-timestamp or x-signature' });
      }
      const tsNum = Number(timestamp);
      if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > REPLAY_WINDOW_MS) {
        fastify.log.warn({ timestamp }, 'Cresium webhook: stale or invalid timestamp');
        return reply.status(401).send({ error: 'Invalid timestamp' });
      }
      const method = request.method.toUpperCase();
      const pathWithQuery = request.url;
      const ok = verifyCresiumSignature({
        timestamp,
        method,
        pathWithQuery,
        rawBody,
        signatureB64: signature,
        secret,
      });
      if (!ok) {
        fastify.log.warn(
          { method, pathWithQuery, ts: timestamp },
          'Cresium webhook: invalid signature'
        );
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    } else {
      fastify.log.warn('CRESIUM_SKIP_SIGNATURE_VERIFY=true — no se valida firma');
    }

    const amountCents = parseAmountCents(body);
    if (amountCents == null || amountCents <= 0) {
      fastify.log.warn({ bodyKeys: Object.keys(body) }, 'Cresium deposit: could not parse amount');
      return reply.status(400).send({ error: 'Invalid or missing amount' });
    }

    if (!depositSuccess(body)) {
      fastify.log.info({ status: body.status }, 'Cresium deposit: non-success status, skipping persist');
      return reply.status(200).send({ status: 'ignored', reason: 'not_success' });
    }

    const extRef = externalKey(body);

    if (redis) {
      try {
        const eventId = `cresium:deposit:${tenantId}:${extRef}`;
        const isNew = await redis.setnx(eventId, '1');
        if (!isNew) {
          fastify.log.info({ externalRef: extRef }, 'Cresium deposit duplicate');
          return reply.status(200).send({ status: 'duplicate' });
        }
        await redis.expire(eventId, 86400);
      } catch (e: unknown) {
        fastify.log.warn({ err: (e as Error).message }, 'Redis idempotency error (continuing)');
      }
    }

    const existing = await prisma.payment.findFirst({
      where: { tenantId, sourceSystem: 'CRESIUM', externalRef: extRef },
    });
    if (existing) {
      return reply.status(200).send({ status: 'duplicate' });
    }

    const invoice = await findInvoiceMatch(tenantId, body);

    try {
      if (invoice) {
        const payment = await prisma.payment.create({
          data: {
            tenantId,
            sourceSystem: 'CRESIUM',
            method: 'TRANSFERENCIA',
            status: 'LIQUIDADO',
            externalRef: extRef,
            settledAt: new Date(),
            totalAmountCents: null,
          },
        });
        await prisma.paymentApplication.create({
          data: {
            tenantId,
            paymentId: payment.id,
            invoiceId: invoice.id,
            amount: amountCents,
            isAuthoritative: true,
            appliedAt: new Date(),
            externalApplicationRef: `cresium:${extRef}:${invoice.id}`,
          },
        });
        fastify.log.info(
          { paymentId: payment.id, invoiceId: invoice.id, externalRef: extRef, amountCents },
          'Cresium deposit applied to invoice'
        );
        return reply.status(200).send({
          status: 'ok',
          matchedInvoice: invoice.numero,
          paymentId: payment.id,
        });
      }

      const payment = await prisma.payment.create({
        data: {
          tenantId,
          sourceSystem: 'CRESIUM',
          method: 'TRANSFERENCIA',
          status: 'PEND_LIQ',
          externalRef: extRef,
          totalAmountCents: amountCents,
        },
      });
      fastify.log.info(
        { paymentId: payment.id, externalRef: extRef, amountCents },
        'Cresium deposit stored without invoice match (pending imputation)'
      );
      return reply.status(200).send({
        status: 'ok',
        matchedInvoice: null,
        paymentId: payment.id,
        pendingImputation: true,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      fastify.log.error({ err: msg }, 'Cresium deposit persist error');
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
