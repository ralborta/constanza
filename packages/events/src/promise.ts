import { z } from 'zod';

export const PromiseCreated = z.object({
  tenantId: z.string().uuid(),
  promiseId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: z.number().int().positive().nullable(),
  dueDate: z.string().date(),
  channel: z.enum(['EMAIL', 'WHATSAPP', 'VOICE']),
});

export type PromiseCreated = z.infer<typeof PromiseCreated>;

export const PromiseFulfilled = z.object({
  tenantId: z.string().uuid(),
  promiseId: z.string().uuid(),
  fulfilledAt: z.string().datetime(),
});

export type PromiseFulfilled = z.infer<typeof PromiseFulfilled>;

export const PromiseBroken = z.object({
  tenantId: z.string().uuid(),
  promiseId: z.string().uuid(),
  reason: z.string().optional(),
});

export type PromiseBroken = z.infer<typeof PromiseBroken>;

