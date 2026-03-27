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
import { syncInvoiceEstadoFromApplications } from '../services/invoice-estado-sync.js';

const prisma = new PrismaClient();
const NOTIFIER_URL = process.env.NOTIFIER_URL?.replace(/\/+$/, '') ?? '';
const PAYMENT_RECEIVER_PHONE = process.env.PAYMENT_RECEIVER_PHONE?.trim() ?? '';
const PAYMENT_COMPANY_NAME = process.env.PAYMENT_COMPANY_NAME?.trim() ?? '';

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

/** JSON estable (claves ordenadas) por si el body firmado no coincide byte-a-byte con el raw. */
function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((x) => stableStringify(x)).join(',')}]`;
  }
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',')}}`;
}

function timingSafeEqualHmac(expectedB64: string, incoming: string): boolean {
  let expBuf: Buffer;
  try {
    expBuf = Buffer.from(expectedB64, 'base64');
  } catch {
    return false;
  }
  const s = incoming.trim();
  const tryBuf = (buf: Buffer) =>
    buf.length === expBuf.length && crypto.timingSafeEqual(buf, expBuf);

  try {
    const b = Buffer.from(s, 'base64');
    if (tryBuf(b)) return true;
  } catch {
    /* siguiente */
  }

  const b64url = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64url.length % 4;
  try {
    const b2 = Buffer.from(pad ? b64url + '='.repeat(4 - pad) : b64url, 'base64');
    if (tryBuf(b2)) return true;
  } catch {
    /* siguiente */
  }

  const hex = s.replace(/^0x/i, '');
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length === expBuf.length * 2) {
    try {
      const b3 = Buffer.from(hex, 'hex');
      if (tryBuf(b3)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

/** Si pegaron el secret en base64 por error, probamos también la decodificación UTF-8. */
function secretVariants(secret: string): string[] {
  const s = secret.trim();
  const out = new Set<string>([s]);
  if (s.length >= 16 && /^[A-Za-z0-9+/]+=*$/.test(s.replace(/\s/g, ''))) {
    try {
      const dec = Buffer.from(s.replace(/\s/g, ''), 'base64');
      if (dec.length > 0 && dec.length < 512) {
        const asUtf8 = dec.toString('utf8');
        if (asUtf8.length > 0) out.add(asUtf8);
      }
    } catch {
      /* ignore */
    }
  }
  return [...out];
}

/**
 * Cresium API: `timestamp|METHOD|PATH|BODY` (y a veces PATH+BODY sin `|` intermedio).
 * Webhooks con envelope `{ type, data }` a veces firman solo el JSON de `data`.
 * Probamos varias construcciones + HMAC solo del body (modo usado por otros PSP).
 */
function verifyCresiumSignatureOne(opts: {
  timestamp: string;
  method: string;
  pathWithQuery: string;
  rawBody: string;
  signatureB64: string;
  secret: string;
  companyId?: string;
  apiKey?: string;
}): boolean {
  const { timestamp, method, pathWithQuery, rawBody, secret } = opts;
  const constructions: string[] = [
    `${timestamp}|${method}|${pathWithQuery}|${rawBody}`,
    `${timestamp}|${method}|${pathWithQuery}${rawBody}`,
    `${method}|${timestamp}|${pathWithQuery}|${rawBody}`,
    `${timestamp}|${pathWithQuery}|${method}|${rawBody}`,
  ];
  if (opts.companyId) {
    constructions.push(
      `${timestamp}|${opts.companyId}|${method}|${pathWithQuery}|${rawBody}`,
      `${timestamp}|${method}|${opts.companyId}|${pathWithQuery}|${rawBody}`
    );
  }
  if (opts.apiKey) {
    constructions.push(`${timestamp}|${opts.apiKey}|${method}|${pathWithQuery}|${rawBody}`);
  }
  for (const data of constructions) {
    const expected = crypto.createHmac('sha256', secret).update(data, 'utf8').digest('base64');
    if (timingSafeEqualHmac(expected, opts.signatureB64)) return true;
  }
  const bodyOnly = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  if (timingSafeEqualHmac(bodyOnly, opts.signatureB64)) return true;
  return false;
}

/**
 * Cresium V3 documenta `x-timestamp` en ms para la API; en webhooks a veces mandan ISO.
 * El string que entra al HMAC debe coincidir con el que usaron al firmar (epoch ms, epoch seg, o ISO).
 */
function candidateTimestampStringsForSignature(headerVal: string): string[] {
  const raw = String(headerVal).trim();
  const out = new Set<string>([raw]);

  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) {
    if (n < 1e12) {
      out.add(String(Math.floor(n)));
      out.add(String(Math.round(n * 1000)));
    } else {
      out.add(String(Math.floor(n)));
      out.add(String(Math.floor(n / 1000)));
    }
  }

  const ms = Date.parse(raw);
  if (Number.isFinite(ms)) {
    out.add(String(ms));
    out.add(String(Math.floor(ms / 1000)));
  }

  return [...out];
}

function candidatePaths(pathWithQuery: string): string[] {
  const u = String(pathWithQuery ?? '');
  const out = new Set<string>([u]);
  const pathOnly = u.includes('?') ? u.slice(0, u.indexOf('?')) : u;
  const query = u.includes('?') ? u.slice(u.indexOf('?')) : '';
  if (pathOnly.startsWith('/')) {
    out.add(pathOnly.slice(1) + query);
  } else if (pathOnly.length > 0) {
    out.add(`/${pathOnly}${query}`);
  }
  return [...out];
}

function candidateBodies(rawBody: string, parsedBody: unknown): string[] {
  const out = new Set<string>();
  out.add(rawBody);
  const tr = rawBody.trim();
  if (tr !== rawBody) out.add(tr);
  if (parsedBody !== undefined && parsedBody !== null && typeof parsedBody === 'object') {
    try {
      out.add(JSON.stringify(parsedBody));
      out.add(stableStringify(parsedBody));
    } catch {
      /* ignore */
    }
    // Webhook tipo { type, data, retry? } — a veces solo `data` entra al HMAC
    if ('data' in (parsedBody as object)) {
      const d = (parsedBody as { data: unknown }).data;
      if (d !== undefined) {
        try {
          out.add(JSON.stringify(d));
          if (d !== null && typeof d === 'object') {
            out.add(stableStringify(d));
          }
        } catch {
          /* ignore */
        }
      }
    }
  }
  return [...out];
}

function verifyCresiumSignatureFlexible(opts: {
  timestampHeader: string;
  method: string;
  pathWithQuery: string;
  rawBody: string;
  parsedBody: unknown;
  signatureB64: string;
  secrets: string[];
  companyIdHeader?: string;
  apiKeyHeader?: string;
}): boolean {
  const tsList = candidateTimestampStringsForSignature(opts.timestampHeader);
  const pathList = candidatePaths(opts.pathWithQuery);
  const bodyList = candidateBodies(opts.rawBody, opts.parsedBody);
  const companyId = opts.companyIdHeader?.trim();
  const apiKey = opts.apiKeyHeader?.trim();

  const secretList = opts.secrets.flatMap((s) => secretVariants(s));

  for (const secret of secretList) {
    if (!secret) continue;
    for (const timestamp of tsList) {
      for (const pathWithQuery of pathList) {
        for (const rawBody of bodyList) {
          if (
            verifyCresiumSignatureOne({
              timestamp,
              method: opts.method,
              pathWithQuery,
              rawBody,
              signatureB64: opts.signatureB64,
              secret,
              companyId: companyId || undefined,
              apiKey: apiKey || undefined,
            })
          ) {
            return true;
          }
        }
      }
    }
  }
  return false;
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

function normalizeAmountKey(k: string): string {
  return k.toLowerCase().replace(/[_-]/g, '');
}

/** Claves típicas de monto en webhooks Cresium / AR (root o anidadas en `data`). */
const AMOUNT_KEY_HINTS = new Set([
  'totalamount',
  'amount',
  'totalamountcents',
  'amountcents',
  'total_amount',
  'value',
  'monto',
  'importe',
  'montopesos',
  'montototal',
  'montorecibido',
  'total',
  'paidamount',
  'transactionamount',
  'netamount',
  'grossamount',
  'originalamount',
  'principal',
  'importetotal',
]);

function amountKeyMatches(normalizedKey: string): boolean {
  if (AMOUNT_KEY_HINTS.has(normalizedKey)) return true;
  if (normalizedKey.includes('monto') || normalizedKey.includes('importe')) return true;
  if (normalizedKey.includes('amount') && !normalizedKey.includes('tax')) return true;
  return false;
}

function toAmountCents(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === 'string' ? Number(raw.replace(',', '.')) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const asCents = process.env.CRESIUM_AMOUNT_UNIT === 'CENTS';
  if (asCents) return Math.round(n);
  return Math.round(n * 100);
}

/**
 * Busca un número de monto en un objeto (prioridad: claves conocidas, luego subobjetos).
 */
function extractAmountCentsDeep(obj: unknown, depth: number): number | null {
  if (depth > 12 || obj == null) return null;
  if (typeof obj !== 'object') return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const f = extractAmountCentsDeep(item, depth + 1);
      if (f != null) return f;
    }
    return null;
  }
  const o = obj as Record<string, unknown>;
  const pairs: [string, unknown][] = [];
  for (const [k, v] of Object.entries(o)) {
    pairs.push([k, v]);
  }
  for (const [k, v] of pairs) {
    if (amountKeyMatches(normalizeAmountKey(k))) {
      const c = toAmountCents(v);
      if (c != null) return c;
    }
  }
  for (const [, v] of pairs) {
    if (v && typeof v === 'object') {
      const c = extractAmountCentsDeep(v, depth + 1);
      if (c != null) return c;
    }
  }
  return null;
}

function parseAmountCents(body: Record<string, unknown>): number | null {
  const data = body.data as Record<string, unknown> | undefined;
  /** Cresium suele anidar el cobro en `data.transaction`. */
  const tx = data?.transaction as Record<string, unknown> | undefined;

  const flatCandidates: unknown[] = [
    body.totalAmount,
    body.amount,
    body.total_amount,
    body.value,
    body.monto,
    body.importe,
    data?.totalAmount,
    data?.amount,
    data?.total_amount,
    data?.value,
    data?.monto,
    data?.importe,
    data?.total,
    data?.montopesos,
    data?.importeTotal,
    data?.importe_total,
    tx?.amount,
    tx?.totalAmount,
    tx?.total_amount,
    tx?.monto,
    tx?.importe,
    tx?.value,
    tx?.total,
    tx?.originalAmount,
    tx?.netAmount,
  ];

  for (const raw of flatCandidates) {
    const c = toAmountCents(raw);
    if (c != null) return c;
  }

  if (data) {
    const deep = extractAmountCentsDeep(data, 0);
    if (deep != null) return deep;
  }

  return extractAmountCentsDeep(body, 0);
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
  const data = body.data as Record<string, unknown> | undefined;
  const s = String(body.status ?? body.state ?? data?.status ?? data?.state ?? '').toUpperCase().trim();
  if (!s) return true;
  return DEPOSIT_SUCCESS_STATUSES.has(s);
}

function externalKey(body: Record<string, unknown>): string {
  const data = body.data as Record<string, unknown> | undefined;
  const tx = data?.transaction as Record<string, unknown> | undefined;
  const ext =
    body.externalId ??
    body.external_id ??
    data?.externalId ??
    data?.external_id ??
    data?.externalRef ??
    data?.external_ref ??
    tx?.externalId ??
    tx?.external_id;
  if (typeof ext === 'string' && ext.length > 0) return ext;
  const id =
    body.id ??
    data?.id ??
    data?.transactionId ??
    data?.transaction_id ??
    tx?.id ??
    tx?.transactionId;
  if (id != null) return String(id);
  return crypto.randomUUID();
}

function formatArsFromCents(cents: number): string {
  return (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function sendWhatsAppViaNotifier(opts: {
  number: string;
  message: string;
  fastify: FastifyInstance;
  target: 'receiver' | 'payer';
}): Promise<void> {
  const { number, message, fastify, target } = opts;
  if (!NOTIFIER_URL || !number || !message) {
    fastify.log.warn(
      {
        notifierConfigured: Boolean(NOTIFIER_URL),
        numberPresent: Boolean(number),
        messagePresent: Boolean(message),
        target,
      },
      'Payment notification skipped: missing notifier config/data'
    );
    return;
  }
  try {
    fastify.log.info(
      { target, numberPreview: number.slice(0, 6) + '***' },
      'Payment notification attempt'
    );
    const directRes = await fetch(`${NOTIFIER_URL}/notify/send-direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'WHATSAPP',
        to: number,
        message,
        source: 'cresium-deposito',
      }),
    });

    if (directRes.ok) {
      fastify.log.info({ target }, 'Payment notification queued via notifier (send-direct)');
      return;
    }

    // Compatibilidad con notifier viejo (sin /notify/send-direct).
    if (directRes.status === 404) {
      const legacyRes = await fetch(`${NOTIFIER_URL}/wa/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number,
          message,
        }),
      });
      if (legacyRes.ok) {
        fastify.log.info({ target }, 'Payment notification queued via notifier (wa/test-send fallback)');
        return;
      }
      const legacyErr = await legacyRes.text().catch(() => '');
      throw new Error(`legacy HTTP ${legacyRes.status}: ${legacyErr.slice(0, 300)}`);
    }

    const directErr = await directRes.text().catch(() => '');
    throw new Error(`direct HTTP ${directRes.status}: ${directErr.slice(0, 300)}`);
  } catch (error: unknown) {
    // No cortar el webhook de cobro si falla WhatsApp.
    fastify.log.error(
      {
        target,
        err: error instanceof Error ? error.message : String(error),
      },
      'Payment notification failed'
    );
  }
}

async function sendPaymentNotifications(opts: {
  amountCents: number;
  tenantName: string;
  customerName: string | null;
  customerPhone: string | null;
  invoiceNumber: string | null;
  fastify: FastifyInstance;
}): Promise<void> {
  opts.fastify.log.info(
    {
      notifierConfigured: Boolean(NOTIFIER_URL),
      receiverConfigured: Boolean(PAYMENT_RECEIVER_PHONE),
      hasCustomerPhone: Boolean(opts.customerPhone),
      hasInvoiceNumber: Boolean(opts.invoiceNumber),
      tenantName: opts.tenantName,
    },
    'Payment notification flow started'
  );
  const amount = formatArsFromCents(opts.amountCents);
  const fromCustomer = opts.customerName ?? 'Cliente no identificado';
  const invoiceText = opts.invoiceNumber ?? 'Sin imputar';

  if (PAYMENT_RECEIVER_PHONE) {
    const receiverMsg = [
      '✅ *Recibiste un pago*',
      `🏢 *De:* ${fromCustomer}`,
      `🧾 *Factura:* ${invoiceText}`,
      `💵 *Monto:* ${amount}`,
    ].join('\n');
    await sendWhatsAppViaNotifier({
      number: PAYMENT_RECEIVER_PHONE,
      message: receiverMsg,
      fastify: opts.fastify,
      target: 'receiver',
    });
  } else {
    opts.fastify.log.warn('Payment receiver notification skipped: PAYMENT_RECEIVER_PHONE missing');
  }

  if (opts.customerPhone && opts.invoiceNumber) {
    const payerMsg = [
      '✅ *Tu pago fue imputado correctamente*',
      `🧾 *Factura:* ${opts.invoiceNumber}`,
      `🏢 *Empresa:* ${opts.tenantName}`,
      `💵 *Monto:* ${amount}`,
      '',
      'Gracias por tu pago.',
    ].join('\n');
    await sendWhatsAppViaNotifier({
      number: opts.customerPhone,
      message: payerMsg,
      fastify: opts.fastify,
      target: 'payer',
    });
  } else {
    opts.fastify.log.info(
      {
        hasCustomerPhone: Boolean(opts.customerPhone),
        hasInvoiceNumber: Boolean(opts.invoiceNumber),
      },
      'Payer notification skipped: requires matched invoice and customer phone'
    );
  }
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
  /**
   * Sin esto, `rawBody` suele quedar en "" (el stream ya se consumió o otro parser no rellena el string)
   * mientras `request.body` sí tiene JSON → HMAC con body "" vs body real = invalid signature siempre.
   * Leemos el stream acá y lo devolvemos de nuevo para los parsers posteriores.
   */
  fastify.addHook('preParsing', async (request, _reply, payload) => {
    const pathOnly = String(request.url ?? '').split('?')[0];
    if (request.method !== 'POST' || !pathOnly.endsWith('/deposito')) {
      return payload;
    }
    const chunks: Buffer[] = [];
    try {
      for await (const chunk of payload as AsyncIterable<Buffer | string>) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      }
    } catch {
      return payload;
    }
    const buf = Buffer.concat(chunks);
    const raw = buf.toString('utf8');
    (request as FastifyRequest & { rawBody?: string }).rawBody = raw;
    const { Readable } = await import('stream');
    return Readable.from(buf);
  });

  // Incluye `application/json; charset=utf-8`.
  const jsonMime = /^application\/json(?:;[\s\S]*)?$/i;
  fastify.addContentTypeParser(jsonMime, { parseAs: 'string' }, (req, body, done) => {
    const pre = (req as FastifyRequest & { rawBody?: string }).rawBody;
    const rawBody =
      pre != null && pre.length > 0 ? pre : typeof body === 'string' ? body : String(body);
    (req as FastifyRequest & { rawBody: string }).rawBody = rawBody;
    try {
      const json = JSON.parse(rawBody);
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
    const partnerSecret = process.env.CRESIUM_PARTNER_SECRET?.trim() ?? '';
    /** Algunos paneles distinguen “webhook secret” del secret de API partner. */
    const webhookSecretOnly = process.env.CRESIUM_WEBHOOK_SECRET?.trim() ?? '';
    const signingSecrets = [...new Set([webhookSecretOnly, partnerSecret].filter(Boolean))];
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
      if (signingSecrets.length === 0) {
        fastify.log.error('CRESIUM_PARTNER_SECRET or CRESIUM_WEBHOOK_SECRET not configured');
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
      const ok = verifyCresiumSignatureFlexible({
        timestampHeader: timestamp,
        method,
        pathWithQuery,
        rawBody,
        parsedBody: body,
        signatureB64: signature,
        secrets: signingSecrets,
        companyIdHeader: request.headers['x-company-id'] as string | undefined,
        apiKeyHeader: request.headers['x-api-key'] as string | undefined,
      });
      if (!ok) {
        const debug = process.env.CRESIUM_SIGNATURE_DEBUG === 'true';
        fastify.log.warn(
          {
            method,
            pathWithQuery,
            ts: timestamp,
            rawBodyLength: rawBody.length,
            bodyKeys: body && typeof body === 'object' ? Object.keys(body as object) : [],
            secretsConfigured: signingSecrets.length,
            hasXCompanyId: Boolean(request.headers['x-company-id']),
            hasXApiKey: Boolean(request.headers['x-api-key']),
            ...(debug ? { rawBodyPrefix: rawBody.slice(0, 200) } : {}),
          },
          'Cresium webhook: invalid signature — con raw body OK el 401 es casi siempre **CRESIUM_PARTNER_SECRET** distinto al que usa Cresium para este webhook, o secret distinto de “API Partner”. Probar CRESIUM_WEBHOOK_SECRET o pedir a Cresium el ejemplo oficial string→firma.'
        );
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    } else {
      fastify.log.warn('CRESIUM_SKIP_SIGNATURE_VERIFY=true — no se valida firma');
    }

    const dataObj = body.data as Record<string, unknown> | undefined;
    fastify.log.info(
      {
        bodyKeys: Object.keys(body),
        dataKeys: dataObj && typeof dataObj === 'object' ? Object.keys(dataObj) : [],
        status: body.status ?? dataObj?.status,
        state: body.state ?? dataObj?.state,
        hasTotalAmount:
          body.totalAmount != null ||
          body.amount != null ||
          (dataObj != null &&
            (dataObj.totalAmount != null ||
              dataObj.amount != null ||
              dataObj.monto != null ||
              dataObj.importe != null)),
      },
      'Cresium deposit: request accepted (post-signature)'
    );

    const amountCents = parseAmountCents(body);
    if (amountCents == null || amountCents <= 0) {
      const data = body.data as Record<string, unknown> | undefined;
      fastify.log.warn(
        {
          bodyKeys: Object.keys(body),
          dataKeys: data && typeof data === 'object' ? Object.keys(data) : [],
          type: body.type,
        },
        'Cresium deposit: could not parse amount (revisá nombres de monto en `data`)'
      );
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
      select: { name: true, cresiumCvuCobro: true },
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
        const invoiceForNotification = await prisma.invoice.findUnique({
          where: { id: matched.id },
          select: {
            numero: true,
            customer: {
              select: {
                razonSocial: true,
                telefono: true,
              },
            },
          },
        });

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
        await syncInvoiceEstadoFromApplications(prisma, matched.id);
        await sendPaymentNotifications({
          amountCents,
          tenantName: PAYMENT_COMPANY_NAME || tenant?.name || 'Tu empresa',
          customerName: invoiceForNotification?.customer?.razonSocial ?? null,
          customerPhone: invoiceForNotification?.customer?.telefono ?? null,
          invoiceNumber: invoiceForNotification?.numero ?? matched.numero,
          fastify,
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
      await sendPaymentNotifications({
        amountCents,
        tenantName: PAYMENT_COMPANY_NAME || tenant?.name || 'Tu empresa',
        customerName: null,
        customerPhone: null,
        invoiceNumber: null,
        fastify,
      });
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
