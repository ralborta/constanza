/**
 * Lógica de extracción / matching para webhooks Cresium.
 * Mantener alineado con apps/api-gateway/src/services/cresium-helpers.ts
 */

export function normalizeArgentineTaxId(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return digits;
  return null;
}

const TAX_ID_HINT_KEYS = [
  'payertaxid',
  'payercuit',
  'cuit',
  'taxid',
  'payerdocument',
  'origintaxid',
  'sendertaxid',
  'customertaxid',
  'debtorcuit',
  'orderingcuit',
  'counterparty',
];

export function extractTaxIdsFromPayload(body: unknown): string[] {
  const found = new Set<string>();

  const scanString = (s: string) => {
    for (const m of s.matchAll(/\b\d{2}[-.]?\d{8}[-.]?\d{1}\b/g)) {
      const n = normalizeArgentineTaxId(m[0]);
      if (n) found.add(n);
    }
    for (const m of s.matchAll(/\b\d{11}\b/g)) {
      const n = normalizeArgentineTaxId(m[0]);
      if (n) found.add(n);
    }
  };

  const visit = (v: unknown, depth: number) => {
    if (depth > 14) return;
    if (typeof v === 'string') scanString(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        const kl = k.toLowerCase().replace(/[_-]/g, '');
        if (TAX_ID_HINT_KEYS.some((h) => kl.includes(h)) && typeof val === 'string') {
          const n = normalizeArgentineTaxId(val);
          if (n) found.add(n);
        }
        visit(val, depth + 1);
      }
    } else if (Array.isArray(v)) {
      for (const item of v) visit(item, depth + 1);
    }
  };

  visit(body, 0);
  return [...found];
}

export function extractCvuDigitsFromPayload(body: unknown): string[] {
  const found = new Set<string>();
  const visit = (v: unknown, depth: number) => {
    if (depth > 14 || found.size > 30) return;
    if (typeof v === 'string') {
      const digits = v.replace(/\D/g, '');
      if (digits.length >= 20 && digits.length <= 22) found.add(digits);
    } else if (v && typeof v === 'object') {
      for (const val of Object.values(v as object)) visit(val, depth + 1);
    }
  };
  visit(body, 0);
  return [...found];
}

export function cvuNormalized(cvu: string): string {
  return cvu.replace(/\D/g, '');
}

/** Si no hay CVU configurado en tenant, no valida. Si hay, el payload debe contener ese CVU (22 dígitos o subcadena razonable). */
export function tenantCvuMatchesPayload(expectedRaw: string | null | undefined, body: unknown): boolean {
  if (expectedRaw == null || String(expectedRaw).trim() === '') return true;
  const exp = cvuNormalized(String(expectedRaw));
  if (exp.length < 8) return true;
  const fromPayload = extractCvuDigitsFromPayload(body);
  if (fromPayload.length === 0) return true;
  return fromPayload.some((c) => c === exp || c.endsWith(exp) || exp.endsWith(c));
}

export type InvoicePendingRow = {
  id: string;
  numero: string;
  customerId: string;
  monto: number;
  appliedSum: number;
};

export function pickSingleExactPendingInvoice(
  rows: InvoicePendingRow[],
  amountCents: number,
  customerIdFilter?: Set<string> | null
): InvoicePendingRow | null {
  let list = rows.map((r) => ({
    ...r,
    pending: r.monto - r.appliedSum,
  }));
  list = list.filter((r) => r.pending > 0);
  if (customerIdFilter && customerIdFilter.size > 0) {
    list = list.filter((r) => customerIdFilter.has(r.customerId));
  }
  const matches = list.filter((r) => r.pending === amountCents);
  if (matches.length !== 1) return null;
  const m = matches[0];
  return { id: m.id, numero: m.numero, customerId: m.customerId, monto: m.monto, appliedSum: m.appliedSum };
}

/** ID numérico de transacción Cresium (API v3) si viene en el webhook; sirve para GET /v3/transaction/{id}. */
export function extractCresiumNumericTransactionId(body: Record<string, unknown>): number | null {
  const data = body.data as Record<string, unknown> | undefined;
  const tx = data?.transaction as Record<string, unknown> | undefined;
  const candidates: unknown[] = [
    tx?.id,
    tx?.transactionId,
    data?.transactionId,
    data?.id,
    body.id,
    (body as Record<string, unknown>).transactionId,
  ];
  for (const raw of candidates) {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return parseInt(raw.trim(), 10);
  }
  return null;
}

export function buildCresiumPaymentMetadata(body: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    source: 'cresium-webhook',
    receivedAt: new Date().toISOString(),
    extractedTaxIds: extractTaxIdsFromPayload(body),
    extractedCvuDigits: extractCvuDigitsFromPayload(body),
    payload: body,
    ...extra,
  };
}
