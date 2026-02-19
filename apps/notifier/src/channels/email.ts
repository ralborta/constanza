import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Errores semánticos para mejor debugging
export enum EmailErrorCode {
  SMTP_CONFIG_MISSING = 'ERROR_SMTP_CONFIG_MISSING',
  SMTP_AUTH_FAILED = 'ERROR_SMTP_AUTH_FAILED',
  INVALID_RECIPIENT = 'ERROR_INVALID_RECIPIENT',
  SMTP_CONNECTION_FAILED = 'ERROR_SMTP_CONNECTION_FAILED',
  SMTP_SEND_FAILED = 'ERROR_SMTP_SEND_FAILED',
  RATE_LIMIT = 'ERROR_RATE_LIMIT',
  UNKNOWN = 'ERROR_UNKNOWN',
}

export class EmailError extends Error {
  constructor(
    public code: EmailErrorCode,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'EmailError';
  }
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string; // Versión texto plano para clientes que no soportan HTML
}

interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

/**
 * Valida formato de email
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

let transporter: Transporter | null = null;

/**
 * Crea el transporter SMTP con la config de env (una sola vez).
 */
function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      'SMTP_HOST, SMTP_USER y SMTP_PASS deben estar configurados'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });

  return transporter;
}

/**
 * Obtiene el remitente configurado
 */
function getFromAddress(): { email: string; name: string } {
  const rawFrom = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  let fromName = process.env.SMTP_FROM_NAME || 'Constanza';
  if (!rawFrom) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      'SMTP_FROM_EMAIL o SMTP_USER debe estar configurado'
    );
  }

  let email = rawFrom.trim();

  if (rawFrom.includes('<') && rawFrom.includes('>')) {
    const match = rawFrom.match(/(.*)<(.+)>/);
    if (match) {
      fromName = match[1].trim().replace(/^"|"$/g, '');
      email = match[2].replace('>', '').trim();
    }
  }

  if (!validateEmail(email)) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      'El remitente configurado no es un email válido'
    );
  }

  return {
    email,
    name: fromName,
  };
}

/**
 * Envía un email por SMTP directo (Nodemailer).
 * Variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
 * SMTP_FROM_EMAIL (opcional), SMTP_FROM_NAME (opcional), SMTP_SECURE (opcional, true para 465).
 *
 * @param params - Parámetros del email
 * @returns Resultado del envío con messageId
 * @throws EmailError con código semántico si falla
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
  getTransporter(); // valida config
  const { email: fromEmail, name: fromName } = getFromAddress();

  if (!validateEmail(to)) {
    throw new EmailError(
      EmailErrorCode.INVALID_RECIPIENT,
      `Email inválido: ${to}`
    );
  }

  const transport = getTransporter();

  try {
    const info = await transport.sendMail({
      from: `"${fromName.replace(/"/g, '\\"')}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    const accepted = (info.accepted as string[] || []).filter(Boolean);
    const rejected = (info.rejected as string[] || []).filter(Boolean);

    return {
      messageId: info.messageId || '',
      accepted,
      rejected,
    };
  } catch (error: any) {
    const msg = error?.message || String(error);

    // Nodemailer / SMTP: códigos típicos
    if (error?.code === 'EAUTH' || msg.toLowerCase().includes('authentication') || msg.toLowerCase().includes('invalid login')) {
      throw new EmailError(
        EmailErrorCode.SMTP_AUTH_FAILED,
        `Error de autenticación SMTP: ${msg}`,
        error
      );
    }

    if (error?.code === 'ECONNECTION' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND' || error?.code === 'ESOCKET') {
      throw new EmailError(
        EmailErrorCode.SMTP_CONNECTION_FAILED,
        `Error de conexión SMTP: ${msg}`,
        error
      );
    }

    // Rate limit (algunos servidores cierran por demasiados envíos)
    if (error?.code === 'EENVELOPE' && msg.toLowerCase().includes('rate')) {
      throw new EmailError(
        EmailErrorCode.RATE_LIMIT,
        `Límite de envío: ${msg}`,
        error
      );
    }

    if (error instanceof EmailError) {
      throw error;
    }

    throw new EmailError(
      EmailErrorCode.SMTP_SEND_FAILED,
      `Error al enviar email: ${msg}`,
      error
    );
  }
}
