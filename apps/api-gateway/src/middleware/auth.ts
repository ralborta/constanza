import { FastifyRequest, FastifyReply } from 'fastify';

export interface JWTPayload {
  tenant_id: string;
  user_id?: string;
  customer_id?: string;
  perfil: 'ADM' | 'OPERADOR_1' | 'OPERADOR_2' | 'CLIENTE';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
    // request.user ya está tipado correctamente por la declaración del módulo
  } catch (err) {
    reply.status(401).send({ error: 'No autorizado' });
  }
}

export function requirePerfil(allowedPerfiles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({ error: 'No autenticado' });
    }

    if (!allowedPerfiles.includes(request.user.perfil)) {
      return reply.status(403).send({ error: 'Permisos insuficientes' });
    }
  };
}

