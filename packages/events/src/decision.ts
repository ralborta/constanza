import { z } from 'zod';

export const DecisionOpened = z.object({
  tenantId: z.string().uuid(),
  decisionId: z.string().uuid(),
  type: z.enum(['DESAPLICAR', 'REAPLICAR', 'CREDIT_NOTE', 'ESCALAR']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  data: z.record(z.unknown()),
});

export type DecisionOpened = z.infer<typeof DecisionOpened>;

export const DecisionResolved = z.object({
  tenantId: z.string().uuid(),
  decisionId: z.string().uuid(),
  resolvedBy: z.string().uuid(),
  resolvedAt: z.string().datetime(),
  action: z.string(),
  comment: z.string().optional(),
});

export type DecisionResolved = z.infer<typeof DecisionResolved>;

