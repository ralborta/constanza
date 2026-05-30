import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STATUS_MAP: Record<string, string> = {
  queued: 'QUEUED',
  accepted: 'SENT',
  sent: 'SENT',
  sending: 'SENT',
  delivered: 'DELIVERED',
  delivery: 'DELIVERED',
  read: 'READ',
  opened: 'READ',
  open: 'READ',
  failed: 'FAILED',
  failure: 'FAILED',
  undelivered: 'FAILED',
  rejected: 'FAILED',
  bounced: 'FAILED',
  bounce: 'FAILED',
};

export type MessageChannel = 'WHATSAPP' | 'EMAIL';

export interface MessageStatusUpdate {
  channel: MessageChannel;
  externalMessageId: string;
  status: string;
  providerStatus?: string;
  occurredAt?: string;
  errorReason?: string;
  payload?: Record<string, unknown>;
}

export function normalizeMessageStatus(status: string): string {
  const key = String(status || '').trim().toLowerCase();
  return STATUS_MAP[key] || String(status || 'UNKNOWN').trim().toUpperCase();
}

function asPayloadObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function applyMessageStatusUpdate(update: MessageStatusUpdate) {
  const normalizedStatus = normalizeMessageStatus(update.status);
  const events = await prisma.contactEvent.findMany({
    where: {
      externalMessageId: update.externalMessageId,
      channel: update.channel,
      direction: 'OUTBOUND',
    },
    select: {
      id: true,
      payload: true,
    },
  });

  for (const event of events) {
    await prisma.contactEvent.update({
      where: { id: event.id },
      data: {
        status: normalizedStatus,
        errorReason: normalizedStatus === 'FAILED' ? update.errorReason ?? null : undefined,
        payload: {
          ...asPayloadObject(event.payload),
          deliveryStatus: {
            providerStatus: update.providerStatus ?? update.status,
            normalizedStatus,
            occurredAt: update.occurredAt ?? new Date().toISOString(),
            errorReason: update.errorReason ?? null,
            payload: update.payload ?? {},
          },
        } as Prisma.InputJsonValue,
      },
    });
  }

  return {
    matched: events.length,
    status: normalizedStatus,
  };
}
