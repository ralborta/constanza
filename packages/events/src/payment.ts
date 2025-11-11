import { z } from 'zod';

export const PaymentAppliedAuthoritative = z.object({
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
  appliedAt: z.string().datetime(),
  applications: z.array(
    z.object({
      invoiceId: z.string().uuid(),
      amount: z.number().int().positive(),
    })
  ),
  provider: z.literal('cucuru'),
});

export type PaymentAppliedAuthoritative = z.infer<typeof PaymentAppliedAuthoritative>;

export const PaymentSettled = z.object({
  tenantId: z.string().uuid(),
  paymentId: z.string().uuid(),
  settledAt: z.string().datetime(),
  provider: z.enum(['cucuru', 'bindx']),
});

export type PaymentSettled = z.infer<typeof PaymentSettled>;

