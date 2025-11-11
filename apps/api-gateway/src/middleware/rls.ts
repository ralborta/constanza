import { FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { JWTPayload } from './auth.js';

const prisma = new PrismaClient();

/**
 * Middleware para setear variables de sesión para RLS
 * Se ejecuta después de autenticación
 */
export async function setRLSContext(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user as JWTPayload;
  if (!user) {
    return;
  }

  // Setear variables de sesión para RLS
  // Nota: Esto requiere que la conexión a DB soporte SET LOCAL
  // En producción, esto se haría en cada query o usando un hook de Prisma
  
  // Por ahora, las queries de Prisma ya filtran por tenant_id
  // RLS en Supabase se activará cuando se configure la conexión directa
}

