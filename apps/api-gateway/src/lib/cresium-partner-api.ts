import crypto from 'node:crypto';

/**
 * Cliente mínimo para API Partner Cresium v3 (HMAC + headers).
 * Alineado con el string de firma del MCP oficial: `ISO8601|METHOD|PATH|BODY`.
 *
 * Variables: CRESIUM_PARTNER_API_BASE (default https://api.cresium.app),
 * CRESIUM_PARTNER_API_KEY o CRESIUM_API_KEY, CRESIUM_PARTNER_SECRET o CRESIUM_SECRET,
 * CRESIUM_COMPANY_ID.
 */
export type CresiumPartnerConfig = {
  baseUrl: string;
  apiKey: string;
  secret: string;
  companyId: string;
};

export function getCresiumPartnerConfig(): CresiumPartnerConfig | null {
  const baseUrl = (process.env.CRESIUM_PARTNER_API_BASE?.trim() || 'https://api.cresium.app').replace(
    /\/$/,
    ''
  );
  const apiKey =
    process.env.CRESIUM_PARTNER_API_KEY?.trim() || process.env.CRESIUM_API_KEY?.trim() || '';
  const secret =
    process.env.CRESIUM_PARTNER_SECRET?.trim() || process.env.CRESIUM_SECRET?.trim() || '';
  const companyId = process.env.CRESIUM_COMPANY_ID?.trim() || '';
  if (!apiKey || !secret || !companyId) return null;
  return { baseUrl, apiKey, secret, companyId };
}

export function signCresiumPartnerRequest(
  method: string,
  path: string,
  bodyStr: string,
  secret: string
): { timestamp: string; signature: string } {
  const timestamp = new Date().toISOString();
  const data = `${timestamp}|${method}|${path}|${bodyStr}`;
  const signature = crypto.createHmac('sha256', secret).update(data, 'utf8').digest('base64');
  return { timestamp, signature };
}

export async function cresiumPartnerFetch(
  cfg: CresiumPartnerConfig,
  method: 'GET' | 'PUT' | 'POST',
  path: string,
  bodyObj?: unknown
): Promise<{ ok: boolean; status: number; json: unknown }> {
  const bodyStr = bodyObj !== undefined ? JSON.stringify(bodyObj) : '';
  const { timestamp, signature } = signCresiumPartnerRequest(method, path, bodyStr, cfg.secret);
  const url = `${cfg.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'x-api-key': cfg.apiKey,
      'x-company-id': cfg.companyId,
      'x-timestamp': timestamp,
      'x-signature': signature,
      ...(bodyStr ? { 'Content-Type': 'application/json' } : {}),
    },
    body: method === 'GET' ? undefined : bodyStr,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}
