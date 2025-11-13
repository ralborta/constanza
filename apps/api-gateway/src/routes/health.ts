import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  });

  // Endpoint de prueba para verificar que las rutas se registren
  fastify.get('/test-seed', async (request, reply) => {
    return {
      message: 'Seed route test - si ves esto, las rutas se registran correctamente',
      timestamp: new Date().toISOString(),
    };
  });
}

