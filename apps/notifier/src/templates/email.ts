import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TemplateVariables {
  nombre_cliente?: string;
  monto?: string;
  fecha_vencimiento?: string;
  numero_factura?: string;
  link_pago?: string;
  fecha_actual?: string;
  [key: string]: string | undefined;
}

interface RenderTemplateOptions {
  templateText: string;
  variables?: Record<string, string>;
  customerId: string;
  invoiceId?: string;
  tenantId: string;
}

/**
 * Resuelve variables dinámicas desde la base de datos si hay invoiceId
 */
async function resolveVariablesFromDB(
  customerId: string,
  invoiceId: string | undefined,
  tenantId: string,
  providedVariables?: Record<string, string>
): Promise<TemplateVariables> {
  // Normalizar variables proporcionadas (remover llaves si las tienen)
  const normalizedProvided: Record<string, string> = {};
  if (providedVariables) {
    for (const [key, value] of Object.entries(providedVariables)) {
      // Remover llaves del nombre de la clave si las tiene
      const normalizedKey = key.replace(/^\{|\}$/g, '');
      normalizedProvided[normalizedKey] = value;
    }
  }

  const variables: TemplateVariables = {
    fecha_actual: new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    ...normalizedProvided,
  };

  try {
    // Obtener datos del cliente
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (customer) {
      // Usar razonSocial o codigoUnico como fallback
      variables.nombre_cliente = customer.razonSocial || customer.codigoUnico || 'Cliente';
    } else {
      variables.nombre_cliente = 'Cliente';
    }

    // Si hay invoiceId, obtener datos de la factura
    if (invoiceId) {
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          tenantId,
          customerId,
        },
      });

      if (invoice) {
        // Formatear monto (está en centavos)
        const montoPesos = (invoice.monto / 100).toFixed(2);
        variables.monto = new Intl.NumberFormat('es-AR', {
          style: 'currency',
          currency: 'ARS',
        }).format(invoice.monto / 100);
        variables.numero_factura = invoice.numero || '';
        variables.fecha_vencimiento = invoice.fechaVto.toLocaleDateString('es-AR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } else {
        // Si no se encuentra la factura, dejar valores vacíos
        variables.monto = '';
        variables.numero_factura = '';
        variables.fecha_vencimiento = '';
      }
    } else {
      // Si no hay invoiceId, dejar valores vacíos
      variables.monto = '';
      variables.numero_factura = '';
      variables.fecha_vencimiento = '';
    }
  } catch (error) {
    console.error('Error resolving variables from DB:', error);
    // Continuar con las variables que ya tenemos
    // Asegurar que nombre_cliente tenga un valor por defecto
    if (!variables.nombre_cliente) {
      variables.nombre_cliente = 'Cliente';
    }
  }

  return variables;
}

/**
 * Reemplaza variables en el texto del template
 */
function replaceVariables(template: string, variables: TemplateVariables): string {
  let result = template;

  // Reemplazar todas las variables {variable_name}
  for (const [key, value] of Object.entries(variables)) {
    if (value === undefined || value === null) {
      continue; // Saltar variables sin valor
    }
    
    // Escapar caracteres especiales para regex
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const placeholder = new RegExp(`\\{${escapedKey}\\}`, 'g');
    const replacement = value;
    
    result = result.replace(placeholder, replacement);
  }

  return result;
}

/**
 * Convierte texto plano a HTML preservando saltos de línea
 */
function textToHtml(text: string): string {
  // Escapar HTML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Convertir saltos de línea a <br> o <p>
  const paragraphs = escaped.split(/\n\s*\n/); // Dobles saltos = párrafos
  const htmlParagraphs = paragraphs.map((para) => {
    if (!para.trim()) return '';
    const lines = para.split(/\n/);
    const htmlLines = lines.map((line) => line.trim()).filter((line) => line);
    return `<p style="margin: 0 0 12px 0; line-height: 1.6; color: #333333;">${htmlLines.join('<br>')}</p>`;
  });

  return htmlParagraphs.join('');
}

/**
 * Template HTML base profesional
 */
function getEmailTemplate(content: string, preheader?: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  ${preheader ? `<meta name="preheader" content="${preheader}">` : ''}
  <title>Constanza - Notificación</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, Helvetica, sans-serif;">
  <!-- Preheader text (visible en algunos clientes) -->
  ${preheader ? `<div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>` : ''}
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Contenedor principal -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 40px; border-radius: 8px 8px 0 0;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td>
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; font-family: Arial, sans-serif;">
                      Constanza
                    </h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-family: Arial, sans-serif;">
                      Gestión de cobranzas
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <p style="margin: 0; color: #6b7280; font-size: 12px; font-family: Arial, sans-serif; line-height: 1.5;">
                      Este es un mensaje automático de <strong>Constanza</strong>.
                    </p>
                    <p style="margin: 8px 0 0 0; color: #9ca3af; font-size: 11px; font-family: Arial, sans-serif;">
                      Por favor, no responda a este correo.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Renderiza un template de email con variables resueltas
 * 
 * @param options - Opciones de renderizado
 * @returns HTML renderizado y texto plano
 */
export async function renderEmailTemplate(
  options: RenderTemplateOptions
): Promise<{ html: string; text: string; subject: string }> {
  const { templateText, variables: providedVariables, customerId, invoiceId, tenantId } = options;

  // Resolver variables desde DB si hay invoiceId
  const resolvedVariables = await resolveVariablesFromDB(
    customerId,
    invoiceId,
    tenantId,
    providedVariables
  );

  // Reemplazar variables en el template
  const resolvedText = replaceVariables(templateText, resolvedVariables);
  const resolvedSubject = replaceVariables(
    providedVariables?.subject || 'Notificación de Constanza',
    resolvedVariables
  );

  // Convertir texto a HTML
  const htmlContent = textToHtml(resolvedText);

  // Generar HTML completo con template
  const preheader = resolvedText.substring(0, 100).replace(/\n/g, ' ').trim();
  const html = getEmailTemplate(htmlContent, preheader);

  return {
    html,
    text: resolvedText,
    subject: resolvedSubject,
  };
}

