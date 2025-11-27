import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { getNotifierBaseUrl } from '../lib/config.js';

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

  // Diagnóstico: verificar conectividad hacia el servicio notifier desde el servidor
  fastify.get('/health/notifier', async () => {
    const NOTIFIER_URL = getNotifierBaseUrl();
    try {
      const resp = await axios.get(`${NOTIFIER_URL}/health`, { timeout: 5000 });
      return {
        ok: true,
        url: NOTIFIER_URL,
        status: resp.status,
        data: resp.data,
      };
    } catch (err: any) {
      return {
        ok: false,
        url: NOTIFIER_URL,
        error: err?.message,
        code: err?.code,
        errno: err?.errno,
      };
    }
  });

  // Alias con prefijo v1 por si el gateway se sirve bajo ese prefijo
  fastify.get('/v1/health/notifier', async () => {
    const NOTIFIER_URL = getNotifierBaseUrl();
    try {
      const resp = await axios.get(`${NOTIFIER_URL}/health`, { timeout: 5000 });
      return {
        ok: true,
        url: NOTIFIER_URL,
        status: resp.status,
        data: resp.data,
      };
    } catch (err: any) {
      return {
        ok: false,
        url: NOTIFIER_URL,
        error: err?.message,
        code: err?.code,
        errno: err?.errno,
      };
    }
  });

  // Proxy diagnóstico: BuilderBot env desde notifier (sin exponer secretos)
  fastify.get('/wa/env', async () => {
    const NOTIFIER_URL = getNotifierBaseUrl();
    try {
      const resp = await axios.get(`${NOTIFIER_URL}/wa/env`, { timeout: 5000 });
      return { ok: true, url: `${NOTIFIER_URL}/wa/env`, data: resp.data };
    } catch (err: any) {
      return { ok: false, url: `${NOTIFIER_URL}/wa/env`, error: err?.message, code: err?.code };
    }
  });

  fastify.get('/v1/wa/env', async () => {
    const NOTIFIER_URL = getNotifierBaseUrl();
    try {
      const resp = await axios.get(`${NOTIFIER_URL}/wa/env`, { timeout: 5000 });
      return { ok: true, url: `${NOTIFIER_URL}/wa/env`, data: resp.data };
    } catch (err: any) {
      return { ok: false, url: `${NOTIFIER_URL}/wa/env`, error: err?.message, code: err?.code };
    }
  });
}

