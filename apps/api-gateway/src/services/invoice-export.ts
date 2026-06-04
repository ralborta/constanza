import PDFDocument from 'pdfkit';
import sharp from 'sharp';

export type InvoiceExportFormat = 'pdf' | 'png' | 'jpg';

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
};

type InvoiceExportResult = {
  buffer: Buffer;
  contentType: string;
  extension: InvoiceExportFormat;
};

function safeDate(value: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function safeMoney(cents: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
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

function buildInvoiceSvg(payload: InvoiceExportPayload): string {
  const dueDate = safeDate(payload.dueDate);
  const issuedAt = safeDate(payload.issuedAt);
  const total = safeMoney(payload.amountCents);
  const cuit = payload.customerCuit ?? 'Sin CUIT';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1900" viewBox="0 0 1400 1900">
  <rect width="1400" height="1900" fill="#ffffff"/>
  <rect x="40" y="40" width="1320" height="1820" fill="none" stroke="#1f2937" stroke-width="2"/>
  <text x="700" y="110" text-anchor="middle" font-size="48" font-family="Arial" font-weight="700" fill="#111827">FACTURA</text>
  <text x="80" y="170" font-size="28" font-family="Arial" fill="#4b5563">Emisor</text>
  <text x="80" y="220" font-size="36" font-family="Arial" font-weight="700" fill="#111827">${escapeXml(payload.tenantName)}</text>
  <text x="80" y="275" font-size="26" font-family="Arial" fill="#374151">Fecha emision: ${escapeXml(issuedAt)}</text>
  <text x="80" y="320" font-size="26" font-family="Arial" fill="#374151">Factura Nro: ${escapeXml(payload.invoiceNumber)}</text>
  <text x="80" y="365" font-size="26" font-family="Arial" fill="#374151">ID interno: ${escapeXml(payload.invoiceId)}</text>

  <rect x="60" y="430" width="1280" height="260" fill="#f9fafb" stroke="#d1d5db" stroke-width="2"/>
  <text x="80" y="490" font-size="30" font-family="Arial" font-weight="700" fill="#111827">Cliente</text>
  <text x="80" y="540" font-size="30" font-family="Arial" fill="#111827">${escapeXml(payload.customerName)}</text>
  <text x="80" y="585" font-size="24" font-family="Arial" fill="#374151">CUIT: ${escapeXml(cuit)}</text>
  <text x="80" y="625" font-size="24" font-family="Arial" fill="#374151">Codigo: ${escapeXml(payload.customerCode)}</text>

  <rect x="60" y="760" width="1280" height="420" fill="#ffffff" stroke="#d1d5db" stroke-width="2"/>
  <rect x="60" y="760" width="1280" height="70" fill="#f3f4f6"/>
  <text x="90" y="806" font-size="24" font-family="Arial" font-weight="700" fill="#111827">Descripcion</text>
  <text x="980" y="806" font-size="24" font-family="Arial" font-weight="700" fill="#111827">Importe</text>
  <line x1="940" y1="760" x2="940" y2="1180" stroke="#d1d5db" stroke-width="2"/>
  <text x="90" y="900" font-size="28" font-family="Arial" fill="#111827">Servicios profesionales facturados</text>
  <text x="980" y="900" font-size="28" font-family="Arial" fill="#111827">${escapeXml(total)}</text>
  <line x1="60" y1="960" x2="1340" y2="960" stroke="#e5e7eb" stroke-width="2"/>
  <text x="90" y="1030" font-size="24" font-family="Arial" fill="#374151">Vencimiento: ${escapeXml(dueDate)}</text>
  <text x="90" y="1080" font-size="24" font-family="Arial" fill="#374151">Estado: ${escapeXml(payload.status)}</text>

  <rect x="60" y="1260" width="1280" height="220" fill="#f9fafb" stroke="#d1d5db" stroke-width="2"/>
  <text x="90" y="1335" font-size="28" font-family="Arial" font-weight="700" fill="#111827">Total</text>
  <text x="980" y="1335" font-size="40" font-family="Arial" font-weight="700" fill="#111827">${escapeXml(total)}</text>
  <text x="90" y="1390" font-size="22" font-family="Arial" fill="#4b5563">Comprobante generado por Constanza</text>

  <text x="700" y="1810" text-anchor="middle" font-size="22" font-family="Arial" fill="#6b7280">
    Este documento puede exportarse como PDF, PNG o JPG.
  </text>
</svg>`;
}

async function renderImage(payload: InvoiceExportPayload, format: 'png' | 'jpg'): Promise<Buffer> {
  const svg = buildInvoiceSvg(payload);
  const pipeline = sharp(Buffer.from(svg, 'utf-8')).flatten({ background: '#ffffff' });
  if (format === 'jpg') {
    return pipeline.jpeg({ quality: 92 }).toBuffer();
  }
  return pipeline.png().toBuffer();
}

async function renderPdf(payload: InvoiceExportPayload): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 48,
      size: 'A4',
      info: {
        Title: `Factura ${payload.invoiceNumber}`,
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(24).text('FACTURA', { align: 'center' });
    doc.moveDown(0.8);
    doc.fontSize(11).fillColor('#4b5563').text(`Emisor: ${payload.tenantName}`);
    doc.text(`Fecha emision: ${safeDate(payload.issuedAt)}`);
    doc.text(`Numero: ${payload.invoiceNumber}`);
    doc.text(`ID interno: ${payload.invoiceId}`);
    doc.moveDown();

    doc.fillColor('#111827').fontSize(14).text('Cliente');
    doc.moveDown(0.3);
    doc.fontSize(11).text(payload.customerName);
    doc.text(`CUIT: ${payload.customerCuit ?? 'Sin CUIT'}`);
    doc.text(`Codigo: ${payload.customerCode}`);
    doc.moveDown();

    doc.fontSize(14).text('Detalle');
    doc.moveDown(0.4);
    doc.fontSize(11).text('Servicios profesionales facturados');
    doc.moveDown(0.2);
    doc.text(`Estado: ${payload.status}`);
    doc.text(`Vencimiento: ${safeDate(payload.dueDate)}`);
    doc.moveDown(1.2);

    doc.fontSize(16).text(`Total: ${safeMoney(payload.amountCents)}`, { align: 'right' });
    doc.moveDown(1.2);
    doc.fontSize(9).fillColor('#6b7280').text('Documento generado por Constanza.');
    doc.end();
  });
}

export async function exportInvoiceFile(
  payload: InvoiceExportPayload,
  format: InvoiceExportFormat
): Promise<InvoiceExportResult> {
  if (format === 'pdf') {
    const buffer = await renderPdf(payload);
    return { buffer, contentType: 'application/pdf', extension: 'pdf' };
  }
  if (format === 'jpg') {
    const buffer = await renderImage(payload, 'jpg');
    return { buffer, contentType: 'image/jpeg', extension: 'jpg' };
  }
  const buffer = await renderImage(payload, 'png');
  return { buffer, contentType: 'image/png', extension: 'png' };
}
