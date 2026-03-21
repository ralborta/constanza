import { FastifyInstance, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import {
  buildCresiumPaymentMetadata,
  cvuNormalized,
  extractCvuDigitsFromPayload,
  extractTaxIdsFromPayload,
  pickSingleExactPendingInvoice,
  type InvoicePendingRow,
} from '../lib/cresium-helpers.js';

const prisma = new PrismaClient();

/** Ventana anti-replay: por defecto 15 min (reintentos de Cresium). Override: CRESIUM_REPLAY_WINDOW_MS */
const REPLAY_WINDOW_MS = (() => {
  const raw = process.env.CRESIUM_REPLAY_WINDOW_MS;
  if (raw != null && raw !== '') {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 15 * 60 * 1000;
})();

/**
 * `x-timestamp` puede venir como:
 * - segundos o milisegundos Unix (número en string)
 * - fecha ISO 8601 (Cresium a veces manda esto → Number(iso) es NaN y antes fallábamos con tsMs: null)
 */
function timestampMsForSkewCheck(headerVal: string): number | null {
  const raw = String(headerVal).trim();
  if (!raw) return null;

  const unit = (process.env.CRESIUM_TIMESTAMP_UNIT ?? 'auto').toLowerCase();

  const n = Number(raw);
  if (Number.isFinite(n)) {
    if (unit === 'seconds') return Math.round(n * 1000);
    if (unit === 'milliseconds' || unit === 'ms') return Math.round(n);
    if (n < 1e12) return Math.round(n * 1000);
    return Math.round(n);
  }

  const parsed = Date.parse(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return null;
}

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
  const data = body.data as Record<string, unknown> | undefined;
  const raw =
    body.totalAmount ??
    body.amount ??
    body.total_amount ??
    body.value ??
    data?.totalAmount ??
    data?.amount ??
    data?.total_amount ??
    data?.value;

  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;

  const asCents = process.env.CRESIUM_AMOUNT_UNIT === 'CENTS';
  if (asCents) return Math.round(n);

  // Por defecto: unidades de moneda → centavos
  return Math.round(n * 100);
}

/** Estados que Cresium (u otros PSP) pueden mandar; vacío = asumir éxito (compat). */
const DEPOSIT_SUCCESS_STATUSES = new Set([
  'SUCCESS',
  'COMPLETED',
  'CONFIRMED',
  'APPROVED',
  'ACCREDITED',
  'SETTLED',
  // Variantes frecuentes en español / APIs locales
  'ACREDITADO',
  'LIQUIDADO',
  'OK',
  'PROCESSED',
  'PAID',
  'FINALIZED',
]);

function depositSuccess(body: Record<string, unknown>): boolean {
  const s = String(body.status ?? body.state ?? '').toUpperCase().trim();
  if (!s) return true;
  return DEPOSIT_SUCCESS_STATUSES.has(s);
}

function externalKey(body: Record<string, unknown>): string {
  const ext = body.externalId ?? body.external_id;
  if (typeof ext === 'string' && ext.length > 0) return ext;
  const id = body.id;
  if (id != null) return String(id);
  return crypto.randomUUID();
}

function cvuStrictMismatch(tenantCvu: string | null | undefined, body: unknown): boolean {
  if (tenantCvu == null || String(tenantCvu).trim() === '') return false;
  const exp = cvuNormalized(String(tenantCvu));
  if (exp.length < 8) return false;
  const found = extractCvuDigitsFromPayload(body);
  if (found.length === 0) return false;
  return !found.some((c) => c === exp || c.endsWith(exp) || exp.endsWith(c));
}

async function loadOpenInvoiceRows(tenantId: string): Promise<InvoicePendingRow[]> {
  const invs = await prisma.invoice.findMany({
    where: {
      tenantId,
      estado: { in: ['ABIERTA', 'VENCIDA', 'PARCIAL'] },
    },
    include: { paymentApplications: true },
    take: 3000,
  });
  return invs.map((i) => ({
    id: i.id,
    numero: i.numero,
    customerId: i.customerId,
    monto: i.monto,
    appliedSum: i.paymentApplications.reduce((s, a) => s + a.amount, 0),
  }));
}

async function customerIdsForTaxIds(tenantId: string, taxIds: string[]): Promise<Set<string>> {
  if (taxIds.length === 0) return new Set();
  const norm = (c: string) => c.replace(/\D/g, '');
  const allCuits = await prisma.customerCuit.findMany({
    where: { tenantId },
    select: { customerId: true, cuit: true },
  });
  const set = new Set<string>();
  for (const t of taxIds) {
    const tn = norm(t);
    if (tn.length !== 11) continue;
    for (const r of allCuits) {
      if (norm(r.cuit) === tn) set.add(r.customerId);
    }
  }
  return set;
}

/** Clientes cuyo CVU guardado en codigoUnico coincide con algún CVU detectado en el payload (payer / contraparte). */
async function customerIdsForPayingCvu(tenantId: string, body: unknown): Promise<Set<string>> {
  const payloadCvus = extractCvuDigitsFromPayload(body);
  if (payloadCvus.length === 0) return new Set();
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    select: { id: true, codigoUnico: true },
  });
  const set = new Set<string>();
  for (const c of customers) {
    const cu = cvuNormalized(c.codigoUnico);
    if (cu.length < 8) continue;
    for (const p of payloadCvus) {
      const pn = cvuNormalized(p);
      if (pn.length < 8) continue;
      if (pn === cu || pn.endsWith(cu) || cu.endsWith(pn)) {
        set.add(c.id);
        break;
      }
    }
  }
  return set;
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
      const tsMs = timestampMsForSkewCheck(timestamp);
      const skew = tsMs != null ? Math.abs(Date.now() - tsMs) : Infinity;
      if (tsMs == null || skew > REPLAY_WINDOW_MS) {
        fastify.log.warn(
          { timestamp, tsMs, skewMs: skew, windowMs: REPLAY_WINDOW_MS },
          'Cresium webhook: stale or invalid timestamp'
        );
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

    fastify.log.info(
      {
        bodyKeys: Object.keys(body),
        status: body.status,
        state: body.state,
        hasTotalAmount: body.totalAmount != null || body.amount != null,
      },
      'Cresium deposit: request accepted (post-signature)'
    );

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

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { cresiumCvuCobro: true },
    });

    if (process.env.CRESIUM_REJECT_CVU_MISMATCH === 'true' && cvuStrictMismatch(tenant?.cresiumCvuCobro, body)) {
      fastify.log.warn('Cresium deposit rejected: CVU cobro no coincide con tenant');
      return reply.status(400).send({ error: 'CVU de cobro no coincide con el configurado en Constanza' });
    }

    const taxIds = extractTaxIdsFromPayload(body);
    const custFilterCuit = await customerIdsForTaxIds(tenantId, taxIds);
    const custFilterCvu = await customerIdsForPayingCvu(tenantId, body);
    const custFilter = new Set<string>();
    for (const id of custFilterCuit) custFilter.add(id);
    for (const id of custFilterCvu) custFilter.add(id);
    const rows = await loadOpenInvoiceRows(tenantId);

    let matched: { id: string; numero: string; reason: string } | null = null;

    const invoiceByText = await findInvoiceMatch(tenantId, body);
    if (invoiceByText) {
      matched = { id: invoiceByText.id, numero: invoiceByText.numero, reason: 'invoice_number_in_payload' };
    }

    if (!matched && custFilter.size > 0) {
      const byCuitOrCvu = pickSingleExactPendingInvoice(
        rows,
        amountCents,
        custFilter
      );
      if (byCuitOrCvu) {
        matched = {
          id: byCuitOrCvu.id,
          numero: byCuitOrCvu.numero,
          reason: 'cuit_or_cvu_exact_balance',
        };
      }
    }

    if (!matched && process.env.CRESIUM_AUTO_MATCH_AMOUNT_ONLY === 'true') {
      const byAmt = pickSingleExactPendingInvoice(rows, amountCents, null);
      if (byAmt) {
        matched = { id: byAmt.id, numero: byAmt.numero, reason: 'amount_only_unique_open_invoice' };
      }
    }

    const metadata = {
      ...buildCresiumPaymentMetadata(body, {
        tenantCvuConfigured: Boolean(tenant?.cresiumCvuCobro),
        cvuMismatchStrictWouldFail:
          process.env.CRESIUM_REJECT_CVU_MISMATCH !== 'true' && cvuStrictMismatch(tenant?.cresiumCvuCobro, body),
        autoMatchReason: matched?.reason ?? null,
        matchedInvoiceId: matched?.id ?? null,
      }),
    };

    try {
      if (matched) {
        const payment = await prisma.payment.create({
          data: {
            tenantId,
            sourceSystem: 'CRESIUM',
            method: 'TRANSFERENCIA',
            status: 'LIQUIDADO',
            externalRef: extRef,
            settledAt: new Date(),
            totalAmountCents: null,
            metadata: metadata as object,
          },
        });
        await prisma.paymentApplication.create({
          data: {
            tenantId,
            paymentId: payment.id,
            invoiceId: matched.id,
            amount: amountCents,
            isAuthoritative: true,
            appliedAt: new Date(),
            externalApplicationRef: `cresium:${extRef}:${matched.id}`,
          },
        });
        fastify.log.info(
          { paymentId: payment.id, invoiceId: matched.id, reason: matched.reason, externalRef: extRef, amountCents },
          'Cresium deposit applied to invoice'
        );
        return reply.status(200).send({
          status: 'ok',
          matchedInvoice: matched.numero,
          matchReason: matched.reason,
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
          metadata: metadata as object,
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
