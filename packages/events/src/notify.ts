import { z } from 'zod';

export const NotifyScheduled = z.object({
  tenantId: z.string().uuid(),
  eventId: z.string().uuid(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'VOICE']),
  scheduledAt: z.string().datetime(),
});

export type NotifyScheduled = z.infer<typeof NotifyScheduled>;

export const NotifyDispatched = z.object({
  tenantId: z.string().uuid(),
  eventId: z.string().uuid(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'VOICE']),
  dispatchedAt: z.string().datetime(),
  externalMessageId: z.string().optional(),
});

export type NotifyDispatched = z.infer<typeof NotifyDispatched>;

export const NotifyFailed = z.object({
  tenantId: z.string().uuid(),
  eventId: z.string().uuid(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'VOICE']),
  errorReason: z.string(),
  failedAt: z.string().datetime(),
});

export type NotifyFailed = z.infer<typeof NotifyFailed>;

