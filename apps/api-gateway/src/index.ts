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
import { notifyRoutes } from './routes/notify.js';
import { callRoutes } from './routes/calls.js';
import { paymentRoutes } from './routes/payments.js';
import { summaryRoutes } from './routes/summaries.js';
import { jobRoutes } from './routes/jobs.js';
import { agentContextRoutes } from './routes/agent-context.js';
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
// CORS: @fastify/cors maneja automáticamente los OPTIONS (preflight)
await server.register(cors, {
  origin: true, // PERMITE TODOS LOS ORIGENES
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
});

await server.register(helmet, {
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

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
await server.register(notifyRoutes, { prefix: '/v1' });
await server.register(callRoutes, { prefix: '/v1' });
await server.register(paymentRoutes, { prefix: '/v1' });
await server.register(summaryRoutes, { prefix: '/v1' });
await server.register(jobRoutes, { prefix: '/v1/jobs' });
await server.register(agentContextRoutes, { prefix: '/v1' });
// chatRoutes ahora está integrado en invoiceRoutes para evitar conflictos de rutas
await server.register(seedRoutes, { prefix: '/seed' });

// Error handler
server.setErrorHandler((error, request, reply) => {
  logger.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
  });
});

// Hook para verificar que esta versión está corriendo
server.addHook('onReady', async () => {
  logger.info('🚀 API-GATEWAY vCORS-FIX DESPLEGADO');
  logger.info('✅ CORS configurado con origin: true');
  logger.info('✅ @fastify/cors maneja OPTIONS automáticamente');
  
  // Listar todas las rutas registradas para debugging
  const routes: string[] = [];
  server.printRoutes().split('\n').forEach((line) => {
    if (line.trim() && line.includes('/invoices')) {
      routes.push(line.trim());
    }
  });
  logger.info({ routes }, 'Rutas de invoices registradas');
});

// Hook para loggear errores de requests
server.addHook('onError', async (request, reply, error) => {
  logger.error({ 
    url: request.url, 
    method: request.method,
    error: error.message,
    stack: error.stack 
  }, 'Error en request');
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
// Force deploy retry endpoint fix - 2025-01-19
// Force deploy fix duplicate errors property - 2025-01-19 18:15
