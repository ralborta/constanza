import type { PrismaClient } from '@prisma/client';

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
}
