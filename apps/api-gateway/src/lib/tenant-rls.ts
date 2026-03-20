/**
 * Si en Postgres está habilitado RLS (p. ej. migración 002_rls_policies.sql),
 * las políticas usan current_setting('app.tenant_id') y app.perfil.
 * Hay que setearlos en la misma transacción que las queries Prisma.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import type { JWTPayload } from '../middleware/auth.js';

export async function withTenantRls<T>(
  user: JWTPayload,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${user.tenant_id}, true)`);
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.perfil', ${user.perfil}, true)`);
    if (user.customer_id) {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.customer_id', ${user.customer_id}, true)`);
    }
    return fn(tx);
  });
}
