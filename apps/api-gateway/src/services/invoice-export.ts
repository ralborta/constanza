import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

export type InvoiceExportFormat = 'pdf' | 'png' | 'jpg';
export type InvoiceExportMode = 'preview' | 'fiscal';

type InvoiceExportPayload = {
  tenantName: string;
  invoiceNumber: string;
  invoiceId: string;
  customerName: string;
  customerCuit: string | null;
  customerCode: string;
  amountCents: number;
  dueDate: Date;
  issuedAt: Date;
  status: string;
  mode?: InvoiceExportMode;
  showInternalRef?: boolean;
};

type InvoiceExportResult = {
  buffer: Buffer;
  contentType: string;
  extension: InvoiceExportFormat;
  templateSource: string;
};

const TEMPLATE_WIDTH = 1240;
const TEMPLATE_HEIGHT = 1754;

const DEFAULT_TEMPLATE_PATH = new URL('../assets/factura-template.png', import.meta.url);
const PROJECT_TEMPLATE_PATH = '/Users/ralborta/Constanza/assets/factura-template.png';

function safeDate(value: Date): string {
  if (Number.isNaN(value.getTime())) return '';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function safeMoney(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function escapeXml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function notEmpty(value?: string | null): string {
  return value?.trim() ?? '';
}

function svgTextLines(lines: string[], startX: number, startY: number, fontSize: number, lineHeight = 1.2): string {
  if (lines.length === 0) return '';
  const tspans = lines
    .map(
      (line, idx) =>
        `<tspan x="${startX}" dy="${idx === 0 ? 0 : Math.round(fontSize * lineHeight)}">${escapeXml(line)}</tspan>`
    )
    .join('');
  return `<text x="${startX}" y="${startY}" font-size="${fontSize}" font-family="Arial" fill="#111111">${tspans}</text>`;
}

function breakLine(value: string, maxChars: number): string[] {
  const text = value.trim();
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildFallbackInvoiceSvg(payload: InvoiceExportPayload): string {
  const issuedAt = safeDate(payload.issuedAt);
  const dueDate = safeDate(payload.dueDate);
  const total = safeMoney(payload.amountCents);
  const customerName = notEmpty(payload.customerName);
  const tenantName = notEmpty(payload.tenantName);
  const customerCuit = notEmpty(payload.customerCuit);
  const customerCode = notEmpty(payload.customerCode);
  const invoiceNumber = notEmpty(payload.invoiceNumber);
  const status = notEmpty(payload.status);
  const mode = payload.mode ?? 'preview';
  const showInternalRef = payload.showInternalRef ?? mode === 'preview';

  const productLines = breakLine('', 70);
  const issuerLines = breakLine(tenantName, 34);
  const customerLines = breakLine(customerName, 38);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TEMPLATE_WIDTH}" height="${TEMPLATE_HEIGHT}" viewBox="0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}">
  <rect width="1240" height="1754" fill="#ffffff"/>
  <rect x="20" y="20" width="1200" height="1714" fill="none" stroke="#202020" stroke-width="1.5"/>
  <rect x="20" y="20" width="1200" height="45" fill="#f0f0f0" stroke="#202020" stroke-width="1"/>
  <text x="620" y="50" text-anchor="middle" font-size="33" font-family="Arial" font-weight="700">ORIGINAL</text>

  <line x1="620" y1="65" x2="620" y2="305" stroke="#202020" stroke-width="1"/>
  <line x1="544" y1="65" x2="544" y2="200" stroke="#202020" stroke-width="1"/>
  <line x1="656" y1="65" x2="656" y2="200" stroke="#202020" stroke-width="1"/>

  ${svgTextLines(issuerLines.length > 0 ? issuerLines : [''], 52, 110, 34)}
  <rect x="544" y="65" width="112" height="135" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <text x="600" y="120" text-anchor="middle" font-size="58" font-family="Arial" font-weight="700">A</text>
  <text x="600" y="162" text-anchor="middle" font-size="24" font-family="Arial" font-weight="700">COD. 01</text>
  <text x="700" y="112" font-size="50" font-family="Arial" font-weight="700">FACTURA</text>

  <text x="52" y="214" font-size="34" font-family="Arial" font-weight="700">Razon Social:</text>
  <text x="200" y="214" font-size="34" font-family="Arial">${escapeXml(tenantName)}</text>
  <text x="52" y="262" font-size="34" font-family="Arial" font-weight="700">Domicilio Comercial:</text>
  <text x="290" y="262" font-size="34" font-family="Arial"></text>
  <text x="52" y="295" font-size="34" font-family="Arial" font-weight="700">Condicion frente al IVA:</text>
  <text x="360" y="295" font-size="34" font-family="Arial" font-weight="700"></text>

  <text x="700" y="160" font-size="30" font-family="Arial" font-weight="700">Punto de Venta:</text>
  <text x="930" y="160" font-size="30" font-family="Arial"></text>
  <text x="1020" y="160" font-size="30" font-family="Arial" font-weight="700">Comp. Nro:</text>
  <text x="1170" y="160" font-size="30" font-family="Arial">${escapeXml(invoiceNumber)}</text>
  <text x="700" y="205" font-size="30" font-family="Arial" font-weight="700">Fecha de Emision:</text>
  <text x="940" y="205" font-size="30" font-family="Arial">${escapeXml(issuedAt)}</text>
  <text x="700" y="258" font-size="30" font-family="Arial" font-weight="700">CUIT:</text>
  <text x="780" y="258" font-size="30" font-family="Arial"></text>
  <text x="700" y="291" font-size="30" font-family="Arial" font-weight="700">Ingresos Brutos:</text>
  <text x="920" y="291" font-size="30" font-family="Arial"></text>
  <text x="700" y="324" font-size="30" font-family="Arial" font-weight="700">Fecha de Inicio de Actividades:</text>
  <text x="1120" y="324" font-size="30" font-family="Arial"></text>

  <line x1="20" y1="305" x2="1220" y2="305" stroke="#202020" stroke-width="1"/>
  <rect x="20" y="305" width="1200" height="48" fill="#f0f0f0" stroke="#202020" stroke-width="1"/>
  <text x="40" y="338" font-size="33" font-family="Arial" font-weight="700">Periodo Facturado Desde:</text>
  <text x="330" y="338" font-size="33" font-family="Arial">${escapeXml(issuedAt)}</text>
  <text x="480" y="338" font-size="33" font-family="Arial" font-weight="700">Hasta:</text>
  <text x="585" y="338" font-size="33" font-family="Arial">${escapeXml(issuedAt)}</text>
  <text x="760" y="338" font-size="33" font-family="Arial" font-weight="700">Fecha de Vto. para el pago:</text>
  <text x="1088" y="338" font-size="33" font-family="Arial">${escapeXml(dueDate)}</text>

  <rect x="20" y="353" width="1200" height="110" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <text x="40" y="392" font-size="28" font-family="Arial">CUIT:</text>
  <text x="105" y="392" font-size="28" font-family="Arial">${escapeXml(customerCuit)}</text>
  <text x="450" y="392" font-size="28" font-family="Arial" font-weight="700">Apellido y Nombre / Razon Social:</text>
  ${svgTextLines(customerLines.length > 0 ? customerLines : [''], 860, 392, 28, 1.05)}
  <text x="40" y="432" font-size="28" font-family="Arial" font-weight="700">Condicion frente al IVA:</text>
  <text x="270" y="432" font-size="28" font-family="Arial"></text>
  <text x="555" y="432" font-size="28" font-family="Arial" font-weight="700">Domicilio Comercial:</text>
  <text x="730" y="432" font-size="28" font-family="Arial"></text>

  <rect x="20" y="518" width="1200" height="39" fill="#d9d9d9" stroke="#202020" stroke-width="1"/>
  <rect x="20" y="557" width="1200" height="510" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <line x1="104" y1="518" x2="104" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="420" y1="518" x2="420" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="530" y1="518" x2="530" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="610" y1="518" x2="610" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="740" y1="518" x2="740" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="810" y1="518" x2="810" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="950" y1="518" x2="950" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="1020" y1="518" x2="1020" y2="1067" stroke="#202020" stroke-width="1"/>
  <line x1="1110" y1="518" x2="1110" y2="1067" stroke="#202020" stroke-width="1"/>

  <text x="32" y="545" font-size="24" font-family="Arial" font-weight="700">Codigo</text>
  <text x="115" y="545" font-size="24" font-family="Arial" font-weight="700">Producto / Servicio</text>
  <text x="442" y="545" font-size="24" font-family="Arial" font-weight="700">Cantidad</text>
  <text x="537" y="545" font-size="24" font-family="Arial" font-weight="700">U. medida</text>
  <text x="632" y="545" font-size="24" font-family="Arial" font-weight="700">Precio Unit.</text>
  <text x="751" y="545" font-size="24" font-family="Arial" font-weight="700">% Bonif</text>
  <text x="846" y="545" font-size="24" font-family="Arial" font-weight="700">Subtotal</text>
  <text x="970" y="545" font-size="24" font-family="Arial" font-weight="700">Alicuota</text>
  <text x="1120" y="545" font-size="24" font-family="Arial" font-weight="700">Subtotal c/IVA</text>

  ${svgTextLines(productLines.length > 0 ? productLines : [''], 112, 590, 29, 1.12)}
  <text x="455" y="590" font-size="29" font-family="Arial"></text>
  <text x="537" y="590" font-size="29" font-family="Arial"></text>
  <text x="665" y="590" font-size="29" font-family="Arial"></text>
  <text x="757" y="590" font-size="29" font-family="Arial"></text>
  <text x="860" y="590" font-size="29" font-family="Arial">${escapeXml(total)}</text>
  <text x="980" y="590" font-size="29" font-family="Arial"></text>
  <text x="1125" y="590" font-size="29" font-family="Arial">${escapeXml(total)}</text>

  <rect x="20" y="1067" width="1200" height="280" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <text x="390" y="1128" font-size="31" font-family="Arial">Importe Otros Tributos: $</text>
  <text x="690" y="1128" font-size="31" font-family="Arial"></text>
  <text x="790" y="1128" font-size="32" font-family="Arial" font-weight="700">Importe Neto No Gravado: $</text>
  <text x="1130" y="1128" font-size="32" font-family="Arial" font-weight="700">${escapeXml(total)}</text>
  <text x="815" y="1170" font-size="32" font-family="Arial" font-weight="700">Importe Neto Gravado: $</text>
  <text x="1130" y="1170" font-size="32" font-family="Arial" font-weight="700">${escapeXml(total)}</text>
  <text x="943" y="1212" font-size="32" font-family="Arial" font-weight="700">IVA 21%: $</text>
  <text x="1130" y="1212" font-size="32" font-family="Arial" font-weight="700"></text>
  <text x="943" y="1254" font-size="40" font-family="Arial" font-weight="700">Importe Total: $</text>
  <text x="1130" y="1254" font-size="40" font-family="Arial" font-weight="700">${escapeXml(total)}</text>

  <rect x="20" y="1347" width="1200" height="52" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <text x="40" y="1382" font-size="31" font-family="Arial" font-style="italic">${mode === 'preview' ? 'Documento no fiscal - vista previa' : ''}</text>

  <rect x="20" y="1399" width="1200" height="160" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <rect x="40" y="1420" width="135" height="130" fill="#ffffff" stroke="#202020" stroke-width="1"/>
  <text x="110" y="1490" text-anchor="middle" font-size="20" font-family="Arial">QR</text>
  <text x="220" y="1462" font-size="28" font-family="Arial" font-weight="700">ARCA</text>
  <text x="220" y="1510" font-size="30" font-family="Arial" font-style="italic" font-weight="700">Comprobante Autorizado</text>
  <text x="560" y="1450" font-size="31" font-family="Arial" font-weight="700">Pag. 1/1</text>
  <text x="775" y="1462" font-size="32" font-family="Arial" font-weight="700">CAE N°:</text>
  <text x="930" y="1462" font-size="32" font-family="Arial"></text>
  <text x="775" y="1510" font-size="32" font-family="Arial" font-weight="700">Fecha de Vto. de CAE:</text>
  <text x="1068" y="1510" font-size="32" font-family="Arial"></text>
  <text x="40" y="1605" font-size="22" font-family="Arial" fill="#444444">${showInternalRef ? `Ref. interna: ${escapeXml(payload.invoiceId)}` : ''}</text>
  <text x="40" y="1640" font-size="22" font-family="Arial" fill="#444444">Estado: ${escapeXml(status)}</text>
  <text x="40" y="1675" font-size="22" font-family="Arial" fill="#444444">Codigo cliente: ${escapeXml(customerCode)}</text>
</svg>`;
}

function buildTemplateOverlaySvg(payload: InvoiceExportPayload): string {
  const issuedAt = safeDate(payload.issuedAt);
  const dueDate = safeDate(payload.dueDate);
  const total = safeMoney(payload.amountCents);

  const tenantName = notEmpty(payload.tenantName);
  const customerName = notEmpty(payload.customerName);
  const customerCuit = notEmpty(payload.customerCuit);
  const invoiceNumber = notEmpty(payload.invoiceNumber);
  const status = notEmpty(payload.status);
  const mode = payload.mode ?? 'preview';
  const showInternalRef = payload.showInternalRef ?? mode === 'preview';

  const productLines = breakLine('', 72);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${TEMPLATE_WIDTH}" height="${TEMPLATE_HEIGHT}" viewBox="0 0 ${TEMPLATE_WIDTH} ${TEMPLATE_HEIGHT}">
    <!-- Limpieza puntual de valores para plantilla con datos de ejemplo -->
    <rect x="56" y="84" width="460" height="42" fill="#ffffff"/>
    <rect x="193" y="182" width="325" height="34" fill="#ffffff"/>
    <rect x="1136" y="132" width="78" height="35" fill="#ffffff"/>
    <rect x="932" y="182" width="282" height="35" fill="#ffffff"/>
    <rect x="330" y="316" width="120" height="28" fill="#ffffff"/>
    <rect x="584" y="316" width="120" height="28" fill="#ffffff"/>
    <rect x="1088" y="316" width="132" height="28" fill="#ffffff"/>
    <rect x="96" y="367" width="160" height="31" fill="#ffffff"/>
    <rect x="740" y="367" width="476" height="31" fill="#ffffff"/>
    <rect x="862" y="562" width="358" height="34" fill="#ffffff"/>
    <rect x="1122" y="562" width="98" height="34" fill="#ffffff"/>
    <rect x="1090" y="1098" width="130" height="190" fill="#ffffff"/>

    <!-- Solo datos dinámicos -->
    <text x="196" y="205" font-size="16" font-family="Arial">${escapeXml(tenantName)}</text>
    <text x="1138" y="155" font-size="16" font-family="Arial">${escapeXml(invoiceNumber)}</text>
    <text x="934" y="206" font-size="16" font-family="Arial">${escapeXml(issuedAt)}</text>

    <text x="330" y="336" font-size="14" font-family="Arial">${escapeXml(issuedAt)}</text>
    <text x="584" y="336" font-size="14" font-family="Arial">${escapeXml(issuedAt)}</text>
    <text x="1088" y="336" font-size="14" font-family="Arial">${escapeXml(dueDate)}</text>

    <text x="96" y="388" font-size="14" font-family="Arial">${escapeXml(customerCuit)}</text>
    ${svgTextLines(breakLine(customerName, 44), 740, 388, 14, 1.05)}

    ${svgTextLines(productLines, 112, 585, 12, 1.12)}
    <text x="862" y="584" font-size="14" font-family="Arial">${escapeXml(total)}</text>
    <text x="1126" y="584" font-size="14" font-family="Arial">${escapeXml(total)}</text>
    <text x="1102" y="1130" font-size="14" font-family="Arial" font-weight="700">${escapeXml(total)}</text>
    <text x="1102" y="1172" font-size="14" font-family="Arial" font-weight="700">${escapeXml(total)}</text>
    <text x="1102" y="1256" font-size="14" font-family="Arial" font-weight="700">${escapeXml(total)}</text>

    <text x="42" y="1630" font-size="12" font-family="Arial" fill="#444444">${showInternalRef ? `Ref: ${escapeXml(payload.invoiceId)} - ${escapeXml(status)}` : `Estado: ${escapeXml(status)}`}</text>
  </svg>`;
}

async function loadTemplateImage(): Promise<Buffer | null> {
  // Prioridad 1: plantilla local fija del proyecto (evita usar rutas viejas en env).
  try {
    return await readFile(PROJECT_TEMPLATE_PATH);
  } catch {
    // continuar
  }

  // Prioridad 2: ruta explícita por variable de entorno.
  const customPath = process.env.INVOICE_TEMPLATE_IMAGE_PATH?.trim();
  if (customPath) {
    try {
      return await readFile(customPath);
    } catch {
      return null;
    }
  }

  // Prioridad 3: fallback empaquetado dentro de src/assets.
  try {
    return await readFile(DEFAULT_TEMPLATE_PATH);
  } catch {
    return null;
  }
}

async function renderImage(payload: InvoiceExportPayload, format: 'png' | 'jpg'): Promise<Buffer> {
  const templateBuffer = await loadTemplateImage();
  if (!templateBuffer) {
    throw new Error(
      'No se encontro la plantilla de factura. Defini INVOICE_TEMPLATE_IMAGE_PATH o coloca factura-template.png en /Users/ralborta/Constanza/assets.'
    );
  }
  const overlaySvg = buildTemplateOverlaySvg(payload);
  const pipeline = sharp(templateBuffer)
    .resize(TEMPLATE_WIDTH, TEMPLATE_HEIGHT, { fit: 'fill' })
    .composite([{ input: Buffer.from(overlaySvg, 'utf-8'), top: 0, left: 0 }])
    .flatten({ background: '#ffffff' });

  if (format === 'jpg') {
    return pipeline.jpeg({ quality: 92 }).toBuffer();
  }
  return pipeline.png().toBuffer();
}

async function renderPdf(payload: InvoiceExportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const imagePromise = renderImage(payload, 'png');
    const doc = new PDFDocument({
      margin: 18,
      size: 'A4',
      info: {
        Title: `Factura ${payload.invoiceNumber}`,
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    imagePromise
      .then((imageBuffer) =>
        sharp(imageBuffer)
          .resize({ width: 560 })
          .png()
          .toBuffer()
      )
      .then((pdfImage) => {
        doc.image(pdfImage, 18, 18, { width: 560 });
        doc.end();
      })
      .catch(reject);
  });
}

export async function exportInvoiceFile(
  payload: InvoiceExportPayload,
  format: InvoiceExportFormat
): Promise<InvoiceExportResult> {
  const customPath = process.env.INVOICE_TEMPLATE_IMAGE_PATH?.trim();
  const templateSource = customPath?.length
    ? customPath
    : PROJECT_TEMPLATE_PATH;

  if (format === 'pdf') {
    const buffer = await renderPdf(payload);
    return { buffer, contentType: 'application/pdf', extension: 'pdf', templateSource };
  }
  if (format === 'jpg') {
    const buffer = await renderImage(payload, 'jpg');
    return { buffer, contentType: 'image/jpeg', extension: 'jpg', templateSource };
  }
  const buffer = await renderImage(payload, 'png');
  return { buffer, contentType: 'image/png', extension: 'png', templateSource };
}
