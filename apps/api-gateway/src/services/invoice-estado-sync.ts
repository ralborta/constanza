import type { PrismaClient } from '@prisma/client';

/**
 * Cierra como CUMPLIDA las promesas PENDIENTE de una factura cuando el cobro
 * imputado cubre el monto comprometido en la promesa.
 *
 * Regla:
 * - Promesa con `amount` definido (> 0): se cumple cuando lo aplicado a la
 *   factura alcanza ese monto comprometido, aunque la factura siga con saldo.
 * - Promesa sin `amount` (null/0): se cumple cuando la factura queda saldada.
 *
 * No marca promesas como ROTA: eso lo resuelve el scheduler al vencimiento.
 */
async function closeFulfilledPromises(
  prisma: PrismaClient,
  invoiceId: string,
  appliedTotal: number,
  invoiceMonto: number
): Promise<void> {
  const promises = await prisma.promise.findMany({
    where: { invoiceId, status: 'PENDIENTE' },
  });
  if (promises.length === 0) return;

  for (const promise of promises) {
    const committed = promise.amount ?? 0;
    const fulfilled =
      committed > 0 ? appliedTotal >= committed : appliedTotal >= invoiceMonto;
    if (!fulfilled) continue;

    await prisma.promise.update({
      where: { id: promise.id },
      data: { status: 'CUMPLIDA' },
    });
  }
}

/**
 * Alinea `Invoice.estado` con el saldo aplicado vía `paymentApplications`.
 * Convención API: SALDADA = cobrada al 100 %, PARCIAL = con aplicación incompleta.
 */
export async function syncInvoiceEstadoFromApplications(
  prisma: PrismaClient,
  invoiceId: string
): Promise<void> {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { paymentApplications: true },
  });
  if (!inv) return;

  const total = inv.paymentApplications.reduce((s, a) => s + a.amount, 0);
  const programada = inv.estado === 'PROGRAMADA' || inv.estado === 'PROGRAMADO';
  if (programada && total === 0) return;

  let next: string;
  if (total >= inv.monto) {
    next = 'SALDADA';
  } else if (total > 0) {
    next = 'PARCIAL';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vto = new Date(inv.fechaVto);
    vto.setHours(0, 0, 0, 0);
    next = vto < today ? 'VENCIDA' : 'ABIERTA';
  }

  if (next !== inv.estado) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { estado: next },
    });
  }

  if (total > 0) {
    await closeFulfilledPromises(prisma, invoiceId, total, inv.monto);
  }
}
