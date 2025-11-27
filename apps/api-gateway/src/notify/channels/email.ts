import sgMail from '@sendgrid/mail';

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

let sendgridInitialized = false;

function ensureSendgridInitialized(): void {
  if (sendgridInitialized) {
    return;
  }

  const apiKey = process.env.SENDGRID_API_KEY || process.env.SMTP_PASS;

  if (!apiKey) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      'SENDGRID_API_KEY (o SMTP_PASS) no está configurado'
    );
  }

  sgMail.setApiKey(apiKey);
  sendgridInitialized = true;
}

/**
 * Envía un email usando SendGrid HTTP API
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
  ensureSendgridInitialized();

  if (!validateEmail(to)) {
    throw new EmailError(
      EmailErrorCode.INVALID_RECIPIENT,
      `Email inválido: ${to}`
    );
  }

  const fromEmail = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '').trim();
  const fromName = process.env.SMTP_FROM_NAME || 'Constanza';
  if (!fromEmail) {
    throw new EmailError(
      EmailErrorCode.SMTP_CONFIG_MISSING,
      'SMTP_FROM_EMAIL o SMTP_USER debe estar configurado'
    );
  }

  const mailOptions = {
    to,
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  try {
    const [response] = await sgMail.send(mailOptions as any);

    if (response.statusCode >= 400) {
      throw new EmailError(
        EmailErrorCode.SMTP_SEND_FAILED,
        `SendGrid respondió con status ${response.statusCode}`
      );
    }

    return {
      messageId:
        (response.headers as any)['x-message-id'] ||
        (response.headers as any)['x-message-id'.toLowerCase()] ||
        '',
      accepted: [to],
      rejected: [],
    };
  } catch (error: any) {
    const statusCode = error?.response?.statusCode;
    const responseErrors = error?.response?.body?.errors;
    const detailedMessage = Array.isArray(responseErrors) && responseErrors.length > 0
      ? responseErrors.map((err: any) => err.message).join('; ')
      : error.message;

    if (statusCode === 401 || statusCode === 403) {
      throw new EmailError(
        EmailErrorCode.SMTP_AUTH_FAILED,
        `Error de autenticación con SendGrid: ${detailedMessage}`,
        error
      );
    }

    if (statusCode === 429) {
      throw new EmailError(
        EmailErrorCode.RATE_LIMIT,
        `Límite de envío alcanzado: ${detailedMessage}`,
        error
      );
    }

    if (!statusCode && (error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND')) {
      throw new EmailError(
        EmailErrorCode.SMTP_CONNECTION_FAILED,
        `Error de conexión SMTP: ${detailedMessage}`,
        error
      );
    }

    if (error instanceof EmailError) {
      throw error;
    }

    throw new EmailError(
      EmailErrorCode.SMTP_SEND_FAILED,
      `Error al enviar email: ${detailedMessage}`,
      error
    );
  }
}


