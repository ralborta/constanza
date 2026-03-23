/**
 * Lógica de extracción / matching para Cresium.
 * Mantener alineado con apps/rail-cucuru/src/lib/cresium-helpers.ts
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

/**
 * Intenta obtener un nombre legible del ordenante / emisor desde el JSON guardado en pay.payments.metadata
 * (payload Cresium anidado en metadata.payload).
 */
export function extractPayerDisplayNameFromMetadata(metadata: unknown): string | null {
  if (metadata == null || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  const root =
    m.payload != null && typeof m.payload === 'object'
      ? (m.payload as Record<string, unknown>)
      : (m as Record<string, unknown>);

  const candidates: string[] = [];

  const looksLikeName = (s: string) => {
    const t = s.trim();
    if (t.length < 2 || t.length > 200) return false;
    const digits = t.replace(/\D/g, '');
    if (digits.length >= 11 && digits.length === t.replace(/\s/g, '').length) return false;
    return true;
  };

  const visit = (obj: unknown, depth: number) => {
    if (depth > 16 || obj == null || typeof obj !== 'object') return;
    const rec = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) {
      const kl = k.toLowerCase().replace(/[_-]/g, '');
      if (typeof v === 'string' && looksLikeName(v)) {
        const priority =
          (kl.includes('payer') && kl.includes('name')) ||
          kl.includes('ordenante') ||
          (kl.includes('titular') && !kl.includes('cuenta') && !kl.includes('cbu')) ||
          kl.includes('emisor') ||
          (kl.includes('sender') && kl.includes('name')) ||
          kl === 'fullname' ||
          (kl.includes('counterparty') && kl.includes('name')) ||
          (kl.includes('origin') && kl.includes('name')) ||
          (kl.includes('debit') && kl.includes('name')) ||
          (kl.includes('nombre') && (kl.includes('orig') || kl.includes('orden')));
        if (priority) {
          candidates.unshift(v.trim());
        }
      } else if (v && typeof v === 'object') {
        visit(v, depth + 1);
      }
    }
  };

  visit(root, 0);

  if (candidates.length > 0) return candidates[0];

  // Segunda pasada: cualquier string bajo clave que sugiera nombre humano
  const fallback: string[] = [];
  const visit2 = (obj: unknown, depth: number) => {
    if (depth > 16 || obj == null || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const kl = k.toLowerCase().replace(/[_-]/g, '');
      if (typeof v === 'string' && looksLikeName(v)) {
        if (
          kl.includes('name') ||
          kl.includes('nombre') ||
          kl.includes('razon') ||
          kl.includes('titular')
        ) {
          fallback.push(v.trim());
        }
      } else if (v && typeof v === 'object') {
        visit2(v, depth + 1);
      }
    }
  };
  visit2(root, 0);
  return fallback[0] ?? null;
}
