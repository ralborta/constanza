/**
 * Si en Postgres está habilitado RLS (p. ej. migración 002_rls_policies.sql),
 * las políticas usan current_setting('app.tenant_id') y app.perfil.
 * Hay que setearlos en la misma transacción que las queries Prisma.
 */
import { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import type { JWTPayload } from '../middleware/auth.js';

// Aceptamos cualquier UUID hexadecimal 8-4-4-4-12 (incluye seeds legacy como 000...0001).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertValidSessionForRls(user: JWTPayload): void {
  if (!UUID_RE.test(user.tenant_id)) {
    const e = new Error('Sesión inválida: tenant_id no es un UUID válido');
    (e as Error & { statusCode?: number }).statusCode = 400;
    throw e;
  }
  if (user.customer_id && !UUID_RE.test(user.customer_id)) {
    const e = new Error('Sesión inválida: customer_id no es un UUID válido');
    (e as Error & { statusCode?: number }).statusCode = 400;
    throw e;
  }
}

export async function withTenantRls<T>(
  user: JWTPayload,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  assertValidSessionForRls(user);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.tenant_id', ${user.tenant_id}, true)`);
    await tx.$executeRaw(Prisma.sql`SELECT set_config('app.perfil', ${user.perfil}, true)`);
    if (user.customer_id) {
      await tx.$executeRaw(Prisma.sql`SELECT set_config('app.customer_id', ${user.customer_id}, true)`);
    }
    return fn(tx);
  });
}
