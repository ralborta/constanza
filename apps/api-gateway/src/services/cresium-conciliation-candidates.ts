import { prisma } from '../lib/prisma.js';
import {
  extractCvuDigitsFromPayload,
  extractTaxIdsFromPayload,
  cvuNormalized,
} from './cresium-helpers.js';

export type ConciliationCandidate = {
  invoiceId: string;
  numero: string;
  customerName: string;
  pendingCents: number;
  exactAmountMatch: boolean;
};

export async function buildCresiumConciliationCandidates(
  tenantId: string,
  payment: {
    totalAmountCents: number | null;
    metadata: unknown;
  }
): Promise<{ extractedTaxIds: string[]; candidates: ConciliationCandidate[] }> {
  const amount = payment.totalAmountCents ?? 0;
  const meta = (payment.metadata as Record<string, unknown> | null) ?? {};

  let taxIds = (meta.extractedTaxIds as string[]) || [];
  if (!Array.isArray(taxIds) || taxIds.length === 0) {
    if (meta.payload) taxIds = extractTaxIdsFromPayload(meta.payload);
    else taxIds = [];
  }

  const norm = (c: string) => c.replace(/\D/g, '');

  const allCuits = await prisma.customerCuit.findMany({
    where: { tenantId },
    select: { customerId: true, cuit: true },
  });

  const customerIdSet = new Set<string>();
  for (const t of taxIds) {
    const tn = norm(t);
    if (tn.length !== 11) continue;
    for (const r of allCuits) {
      if (norm(r.cuit) === tn) customerIdSet.add(r.customerId);
    }
  }

  const payload = meta.payload;
  if (payload) {
    const payloadCvus = extractCvuDigitsFromPayload(payload);
    if (payloadCvus.length > 0) {
      const customers = await prisma.customer.findMany({
        where: { tenantId },
        select: { id: true, codigoUnico: true },
      });
      for (const c of customers) {
        const cu = cvuNormalized(c.codigoUnico);
        if (cu.length < 8) continue;
        for (const p of payloadCvus) {
          const pn = cvuNormalized(p);
          if (pn.length < 8) continue;
          if (pn === cu || pn.endsWith(cu) || cu.endsWith(pn)) {
            customerIdSet.add(c.id);
            break;
          }
        }
      }
    }
  }

  const openWhere = {
    tenantId,
    estado: { in: ['ABIERTA', 'VENCIDA', 'PARCIAL'] as string[] },
    ...(customerIdSet.size > 0 ? { customerId: { in: [...customerIdSet] } } : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where: openWhere,
    include: {
      paymentApplications: true,
      customer: { select: { razonSocial: true } },
    },
    orderBy: { fechaVto: 'asc' },
    take: 500,
  });

  const rows = invoices.map((i) => {
    const appliedSum = i.paymentApplications.reduce((s, a) => s + a.amount, 0);
    const pendingCents = i.monto - appliedSum;
    return {
      invoiceId: i.id,
      numero: i.numero,
      customerName: i.customer.razonSocial,
      pendingCents,
      exactAmountMatch: amount > 0 && pendingCents === amount,
    };
  });

  let candidates = rows.filter((c) => c.pendingCents > 0);

  if (customerIdSet.size === 0 && amount > 0) {
    const exact = candidates.filter((c) => c.exactAmountMatch);
    if (exact.length > 0) candidates = exact;
    else candidates = candidates.slice(0, 40);
  } else {
    candidates = candidates.slice(0, 60);
  }

  candidates.sort((a, b) => {
    if (a.exactAmountMatch !== b.exactAmountMatch) return a.exactAmountMatch ? -1 : 1;
    return a.pendingCents - b.pendingCents;
  });

  return {
    extractedTaxIds: taxIds,
    candidates,
  };
}
