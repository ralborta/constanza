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
 * Envía un email usando nodemailer
 * 
 * @param params - Parámetros del email
 * @returns Resultado del envío con messageId
 * @throws EmailError con código semántico si falla
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<SendEmailResult> {
  ensureSendgridInitialized();

  if (!validateEmail(to)) {
    throw new EmailError(
      EmailErrorCode.INVALID_RECIPIENT,
      `Email inválido: ${to}`
    );
  }

  const { email: fromEmail, name: fromName } = getFromAddress();

  const mailOptions = {
    to,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  };

  try {
    const [response] = await sgMail.send(mailOptions);

    if (response.statusCode >= 400) {
      throw new EmailError(
        EmailErrorCode.SMTP_SEND_FAILED,
        `SendGrid respondió con status ${response.statusCode}`
      );
    }

    return {
      messageId:
        response.headers['x-message-id'] ||
        response.headers['x-message-id'.toLowerCase()] ||
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

