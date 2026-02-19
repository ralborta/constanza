import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ContextoCobranza {
  cliente: {
    id: string;
    nombre: string;
    numero: string;
    estado: string;
  } | null;
  deudas: Array<{
    id: string;
    numero_factura: string;
    monto_original: number;
    monto_pendiente: number;
    estado: string;
    fecha_vencimiento: string;
  }>;
  total_deuda: number;
  ultimo_acuerdo: {
    id: string;
    tipo: string;
    monto_acordado: number;
    porcentaje?: number;
    fecha_acuerdo: string;
    fecha_pago_acordada: string;
    estado: string;
    dias_desde_acuerdo: number;
  } | null;
  historial_reciente: Array<{
    fecha: string;
    mensaje: string;
    respuesta: string;
  }>;
  existe_cliente: boolean;
}

function normalizeDigits(s: string | null): string {
  return (s || '').replace(/\D/g, '');
}

/**
 * Obtiene contexto de cobranza para un número de teléfono (Constanza: Customer, Invoice, Promise, ContactEvent).
 */
export async function obtenerContextoCliente(numero: string): Promise<ContextoCobranza> {
  const want = normalizeDigits(numero);

  const customers = await prisma.customer.findMany({
    where: { activo: true, telefono: { not: null } },
    include: { customerCuits: { where: { isPrimary: true }, take: 1 } },
  });
  const customerFound =
    customers.find((c) => normalizeDigits(c.telefono) === want) ??
    customers.find((c) => c.telefono?.includes(want)) ??
    null;

  if (!customerFound) {
    return {
      cliente: null,
      deudas: [],
      total_deuda: 0,
      ultimo_acuerdo: null,
      historial_reciente: [],
      existe_cliente: false,
    };
  }

  const [invoices, promises, contactEvents] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        customerId: customerFound.id,
        tenantId: customerFound.tenantId,
        estado: { in: ['ABIERTA', 'VENCIDA', 'PARCIAL'] },
      },
      include: { paymentApplications: true },
      orderBy: { fechaVto: 'asc' },
    }),
    prisma.promise.findMany({
      where: { invoice: { customerId: customerFound.id } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { invoice: true },
    }),
    prisma.contactEvent.findMany({
      where: {
        customerId: customerFound.id,
        channel: 'WHATSAPP',
      },
      orderBy: { ts: 'desc' },
      take: 5,
    }),
  ]);

  const deudas = invoices.map((inv) => {
    const montoAplicado = inv.paymentApplications.reduce((s, a) => s + a.amount, 0);
    const montoPendiente = inv.monto - montoAplicado;
    return {
      id: inv.id,
      numero_factura: inv.numero,
      monto_original: inv.monto,
      monto_pendiente: montoPendiente,
      estado: inv.estado,
      fecha_vencimiento: inv.fechaVto.toISOString(),
    };
  });

  const total_deuda = deudas.reduce((s, d) => s + d.monto_pendiente, 0);
  const ultimoPromise = promises[0] ?? null;
  const ultimo_acuerdo = ultimoPromise
    ? {
        id: ultimoPromise.id,
        tipo: ultimoPromise.channel,
        monto_acordado: ultimoPromise.amount ?? 0,
        porcentaje: undefined,
        fecha_acuerdo: ultimoPromise.createdAt.toISOString(),
        fecha_pago_acordada: ultimoPromise.dueDate.toISOString(),
        estado: ultimoPromise.status,
        dias_desde_acuerdo: Math.floor(
          (Date.now() - ultimoPromise.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    : null;

  const historial_reciente = contactEvents.map((ce) => ({
    fecha: ce.ts.toISOString(),
    mensaje: ce.messageText ?? '',
    respuesta: (ce.payload as any)?.respuesta_agente ?? '',
  }));

  return {
    cliente: {
      id: customerFound.id,
      nombre: customerFound.razonSocial,
      numero: customerFound.telefono ?? numero,
      estado: customerFound.activo ? 'activo' : 'inactivo',
    },
    deudas,
    total_deuda,
    ultimo_acuerdo,
    historial_reciente,
    existe_cliente: true,
  };
}
