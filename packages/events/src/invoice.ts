import { z } from 'zod';

export const InvoiceIngested = z.object({
  tenantId: z.string().uuid(),
  invoiceIds: z.array(z.string().uuid()),
  ingestedAt: z.string().datetime(),
});

export type InvoiceIngested = z.infer<typeof InvoiceIngested>;

