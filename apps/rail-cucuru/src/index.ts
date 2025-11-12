import Fastify, { FastifyInstance } from 'fastify';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { webhookRoutes } from './routes/webhooks.js';
import { healthRoutes } from './routes/health.js';
// SimpleLogger está disponible globalmente desde types.d.ts (incluido en tsconfig.json)

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

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

// Routes
await server.register(healthRoutes);
await server.register(webhookRoutes, { prefix: '/wh/cucuru' });

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

