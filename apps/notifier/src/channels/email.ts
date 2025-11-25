import nodemailer from 'nodemailer';

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
 * Valida la configuración SMTP
 */
function validateSmtpConfig(): void {
  const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      `Faltan variables de entorno SMTP: ${missing.join(', ')}`
    );
  }
}

/**
 * Valida formato de email
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Crea y configura el transporter de nodemailer
 */
function createTransporter() {
  validateSmtpConfig();

  const host = process.env.SMTP_HOST!;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = port === 465; // Puerto 465 usa SSL, 587 usa STARTTLS

  return nodemailer.createTransport({
    host,
    port,
    secure,
    family: 4, // Forzar IPv4 para evitar timeouts en entornos donde IPv6 está bloqueado
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
    // Timeouts aumentados para Railway (puede tener latencia de red)
    connectionTimeout: 30000, // 30 segundos (aumentado de 10s)
    greetingTimeout: 30000, // 30 segundos
    socketTimeout: 30000, // 30 segundos
    // Opciones adicionales para mejorar conexión
    tls: {
      // No rechazar certificados no autorizados (útil para algunos entornos)
      rejectUnauthorized: false,
      // Ciphers permitidos
      ciphers: 'SSLv3',
    },
    // Requiere STARTTLS para puerto 587
    requireTLS: port === 587,
    // Debug (solo en desarrollo)
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development',
  });
}

/**
 * Obtiene el remitente configurado
 */
function getFromAddress(): string {
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'Constanza';

  if (!fromEmail) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      'SMTP_FROM_EMAIL o SMTP_USER debe estar configurado'
    );
  }

  // Si ya tiene formato "Nombre <email>", devolverlo tal cual
  if (fromEmail.includes('<')) {
    return fromEmail;
  }

  return `${fromName} <${fromEmail}>`;
}

/**
 * Envía un email usando nodemailer
 * 
 * @param params - Parámetros del email
 * @returns Resultado del envío con messageId
 * @throws EmailError con código semántico si falla
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
  // Validar configuración
  validateSmtpConfig();

  // Validar email del destinatario
  if (!validateEmail(to)) {
    throw new EmailError(
      EmailErrorCode.INVALID_RECIPIENT,
      `Email inválido: ${to}`
    );
  }

  // Crear transporter
  let transporter;
  try {
    transporter = createTransporter();
  } catch (error: any) {
    if (error instanceof EmailError) {
      throw error;
    }
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      `Error al configurar SMTP: ${error.message}`,
      error
    );
  }

  // Verificar conexión (opcional, pero útil para detectar problemas temprano)
  try {
    await transporter.verify();
  } catch (error: any) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    if (errorMessage.includes('auth') || errorMessage.includes('authentication')) {
      throw new EmailError(
        EmailErrorCode.SMTP_AUTH_FAILED,
        `Error de autenticación SMTP: ${error.message}`,
        error
      );
    }
    
    if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
      throw new EmailError(
        EmailErrorCode.SMTP_CONNECTION_FAILED,
        `Error de conexión SMTP: ${error.message}`,
        error
      );
    }

    throw new EmailError(
      EmailErrorCode.SMTP_CONNECTION_FAILED,
      `Error al verificar conexión SMTP: ${error.message}`,
      error
    );
  }

  // Preparar mensaje
  const mailOptions = {
    from: getFromAddress(),
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''), // Fallback a texto plano si no se proporciona
  };

  // Enviar email
  try {
    const info = await transporter.sendMail(mailOptions);

    // Verificar si fue rechazado
    if (info.rejected && info.rejected.length > 0) {
      throw new EmailError(
        EmailErrorCode.SMTP_SEND_FAILED,
        `Email rechazado por el servidor SMTP: ${info.rejected.join(', ')}`
      );
    }

    // Convertir Address[] a string[] si es necesario
    const accepted = (info.accepted || []).map((addr) => 
      typeof addr === 'string' ? addr : addr.address || String(addr)
    );
    const rejected = (info.rejected || []).map((addr) => 
      typeof addr === 'string' ? addr : addr.address || String(addr)
    );

    return {
      messageId: info.messageId || '',
      accepted,
      rejected,
    };
  } catch (error: any) {
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Detectar rate limiting (común en Gmail)
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many') ||
      errorMessage.includes('quota')
    ) {
      throw new EmailError(
        EmailErrorCode.RATE_LIMIT,
        `Límite de envío alcanzado: ${error.message}`,
        error
      );
    }

    // Si ya es un EmailError, re-lanzarlo
    if (error instanceof EmailError) {
      throw error;
    }

    throw new EmailError(
      EmailErrorCode.SMTP_SEND_FAILED,
      `Error al enviar email: ${error.message}`,
      error
    );
  } finally {
    // Cerrar conexión
    transporter.close();
  }
}

