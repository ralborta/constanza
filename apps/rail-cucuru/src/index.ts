import Fastify, { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { cresiumWebhookTestRoutes, webhookRoutes } from './routes/webhooks.js';
import { healthRoutes } from './routes/health.js';
// SimpleLogger está disponible globalmente desde types.d.ts (incluido en tsconfig.json)

const prisma = new PrismaClient();

const server: FastifyInstance = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

const logger = server.log as unknown as SimpleLogger;

// Inicializar Redis de forma opcional con manejo de errores
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        // Reintentar hasta 3 veces, luego dar un delay más largo
        if (times < 3) {
          return Math.min(times * 50, 2000);
        }
        return null; // No reintentar más
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false, // No encolar comandos si está offline
      lazyConnect: true, // No conectar automáticamente
    });

    redis.on('error', (error) => {
      logger.warn({ error: error.message }, 'Redis connection error (continuing without idempotency)');
    });

    redis.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redis.on('close', () => {
      logger.warn('Redis connection closed');
    });

    // Intentar conectar
    redis.connect().catch((error) => {
      logger.warn({ error: error.message }, 'Failed to connect to Redis (continuing without idempotency)');
      redis = null;
    });
  } catch (error: any) {
    logger.warn({ error: error.message }, 'Failed to initialize Redis (continuing without idempotency)');
    redis = null;
  }
} else {
  logger.warn('REDIS_URL not configured - idempotency will be disabled');
}

// Exponer redis en el contexto de Fastify
server.decorate('redis', redis);

// Routes
await server.register(healthRoutes);
await server.register(webhookRoutes, { prefix: '/wh/cucuru' });
// Endpoint temporal de test para capturar el payload de Cresium
await server.register(cresiumWebhookTestRoutes, { prefix: '/wh/cresium' });

// Error handler
server.setErrorHandler((error, request, reply) => {
  logger.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3003;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    logger.info(`🚀 Rail Cucuru running on http://${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

