import { Prisma, PrismaClient } from '@prisma/client';
import { sendWhatsApp } from '../channels/whatsapp.js';

const prisma = new PrismaClient();

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

function isMissingTable(error: any): boolean {
  return error?.code === 'P2021';
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('es-AR')}`;
}

async function recordOutboundEvent(input: {
  tenantId: string;
  customerId: string;
  invoiceId: string | null;
  messageText: string;
  status: string;
  externalMessageId?: string;
  payload?: Record<string, unknown>;
}) {
  await prisma.contactEvent.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      invoiceId: input.invoiceId,
      channel: 'WHATSAPP',
      direction: 'OUTBOUND',
      isManual: false,
      messageText: input.messageText,
      status: input.status,
      externalMessageId: input.externalMessageId,
      payload: input.payload as Prisma.InputJsonValue | undefined,
      ts: new Date(),
    },
  });
}

export class CobranzaScheduler {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly intervalMs = DEFAULT_INTERVAL_MS) {}

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    await this.tick();
    this.intervalId = setInterval(() => {
      this.tick().catch((error) => {
        console.error('[cobranza-scheduler] tick error:', error?.message ?? error);
      });
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
  }

  async tick() {
    await this.processDueCallbacks();
    await this.processDuePromises();
  }

  private async processDueCallbacks() {
    try {
      const callbacks = await prisma.scheduledCallback.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: new Date() },
        },
        include: {
          customer: true,
          invoice: true,
        },
        orderBy: { scheduledAt: 'asc' },
        take: 25,
      });

      for (const callback of callbacks) {
        const customer = callback.customer;
        const invoice = callback.invoice;
        const invoiceText = invoice ? ` por la factura ${invoice.numero}` : '';
        const reasonText = callback.reason ? ` Motivo: ${callback.reason}.` : '';
        const messageText =
          callback.type === 'CALLBACK'
            ? `Hola ${customer.razonSocial}, te contactamos desde Constanza${invoiceText}.${reasonText}`
            : `Hola ${customer.razonSocial}, hacemos seguimiento${invoiceText}.${reasonText}`;

        if (!customer.telefono) {
          await prisma.scheduledCallback.update({
            where: { id: callback.id },
            data: { status: 'CANCELLED' },
          });
          continue;
        }

        try {
          const result = await sendWhatsApp({ to: customer.telefono, message: messageText });
          await recordOutboundEvent({
            tenantId: callback.tenantId,
            customerId: callback.customerId,
            invoiceId: callback.invoiceId,
            messageText,
            status: result.status || 'SENT',
            externalMessageId: result.messageId || undefined,
            payload: { origen: 'scheduled_callback', scheduledCallbackId: callback.id },
          });
          await prisma.scheduledCallback.update({
            where: { id: callback.id },
            data: { status: 'DONE' },
          });
        } catch (error: any) {
          console.warn('[cobranza-scheduler] callback send failed:', {
            callbackId: callback.id,
            error: error?.message,
          });
        }
      }
    } catch (error: any) {
      if (isMissingTable(error)) return;
      throw error;
    }
  }

  private async processDuePromises() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const promises = await prisma.promise.findMany({
      where: {
        status: 'PENDIENTE',
        dueDate: { lt: today },
      },
      include: {
        invoice: {
          include: {
            customer: true,
            paymentApplications: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    for (const promise of promises) {
      const invoice = promise.invoice;
      const customer = invoice.customer;
      const applied = invoice.paymentApplications.reduce((sum, app) => sum + app.amount, 0);

      if (applied >= invoice.monto) {
        await prisma.promise.update({
          where: { id: promise.id },
          data: { status: 'CUMPLIDA' },
        });
        continue;
      }

      await prisma.promise.update({
        where: { id: promise.id },
        data: { status: 'ROTA' },
      });

      if (!customer.telefono) continue;

      const saldo = Math.max(invoice.monto - applied, 0);
      const messageText =
        `Hola ${customer.razonSocial}, registramos pendiente la promesa de pago de la factura ${invoice.numero}. ` +
        `Saldo actual: ${money(saldo)}. Si ya pagaste, por favor enviá el comprobante.`;

      try {
        const result = await sendWhatsApp({ to: customer.telefono, message: messageText });
        await recordOutboundEvent({
          tenantId: promise.tenantId,
          customerId: customer.id,
          invoiceId: invoice.id,
          messageText,
          status: result.status || 'SENT',
          externalMessageId: result.messageId || undefined,
          payload: { origen: 'broken_promise_follow_up', promiseId: promise.id },
        });
      } catch (error: any) {
        console.warn('[cobranza-scheduler] broken promise follow-up failed:', {
          promiseId: promise.id,
          error: error?.message,
        });
      }
    }
  }
}
