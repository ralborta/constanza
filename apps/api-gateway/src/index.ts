import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { invoiceRoutes } from './routes/invoices.js';
import { customerRoutes } from './routes/customers.js';
import { kpiRoutes } from './routes/kpi.js';
import { seedRoutes } from './routes/seed.js';
// SimpleLogger está disponible globalmente desde types.d.ts (incluido en tsconfig.json)

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

// Plugins
await server.register(cors, {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
});

await server.register(helmet);

await server.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await server.register(jwt, {
  secret: process.env.JWT_SECRET || 'change-me-in-production',
});

await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
});

// Routes
await server.register(healthRoutes);
await server.register(authRoutes, { prefix: '/auth' });
await server.register(invoiceRoutes, { prefix: '/v1' });
await server.register(customerRoutes, { prefix: '/v1' });
await server.register(kpiRoutes, { prefix: '/v1' });
await server.register(seedRoutes, { prefix: '/seed' });

// Error handler
server.setErrorHandler((error, request, reply) => {
  logger.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    logger.info(`🚀 API Gateway running on http://${host}:${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

// Force redeploy Wed Nov 12 22:49:28 -03 2025
// Force deploy 1762999033
// Force deploy 1763001770
