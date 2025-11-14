import { Redis } from 'ioredis';
import { fetchIncomingMessages, processIncomingMessage } from '../channels/whatsapp-receive.js';
// SimpleLogger está disponible globalmente desde types.d.ts

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Clave en Redis para almacenar el último mensaje procesado
const LAST_MESSAGE_KEY = 'builderbot:last_message_id';

/**
 * Polling service para consultar mensajes de builderbot periódicamente
 */
export class WhatsAppPoller {
  private intervalId?: NodeJS.Timeout;
  private isRunning = false;
  private pollInterval: number;

  constructor(pollIntervalMs: number = 30000) {
    // Por defecto, consulta cada 30 segundos
    this.pollInterval = pollIntervalMs;
  }

  /**
   * Inicia el polling
   */
  async start() {
    if (this.isRunning) {
      console.warn('WhatsApp poller is already running');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Starting WhatsApp poller (interval: ${this.pollInterval}ms)`);

    // Ejecutar inmediatamente
    await this.poll();

    // Luego ejecutar periódicamente
    this.intervalId = setInterval(async () => {
      await this.poll();
    }, this.pollInterval);
  }

  /**
   * Detiene el polling
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('🛑 WhatsApp poller stopped');
  }

  /**
   * Consulta mensajes nuevos y los procesa
   */
  private async poll() {
    try {
      // Obtener último mensaje procesado
      const lastMessageId = await redis.get(LAST_MESSAGE_KEY);

      // Consultar mensajes nuevos
      const messages = await fetchIncomingMessages(lastMessageId || undefined);

      if (messages.length === 0) {
        console.log('No new messages');
        return;
      }

      console.log(`📨 Found ${messages.length} new messages`);

      // Procesar cada mensaje
      let lastProcessedId = lastMessageId || '';
      for (const message of messages) {
        try {
          const event = await processIncomingMessage(message);
          if (event) {
            console.log(`✅ Processed message ${message.id}`);
            lastProcessedId = message.id;
          }
        } catch (error: any) {
          console.error(`❌ Error processing message ${message.id}:`, error.message);
          // Continuar con el siguiente mensaje
        }
      }

      // Actualizar último mensaje procesado
      if (lastProcessedId && messages.length > 0) {
        await redis.set(LAST_MESSAGE_KEY, lastProcessedId);
      }
    } catch (error: any) {
      console.error('❌ Error in WhatsApp poller:', error.message);
      // No detener el polling por un error, reintentar en el siguiente ciclo
    }
  }
}

