import puppeteer from 'puppeteer-core';

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

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;

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

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function browserExecutablePath(): string | undefined {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROMIUM_PATH ||
    '/usr/bin/chromium'
  );
}

function buildInvoiceHtml(payload: InvoiceExportPayload): string {
  const issuedAt = safeDate(payload.issuedAt);
  const dueDate = safeDate(payload.dueDate);
  const total = safeMoney(payload.amountCents);
  const mode = payload.mode ?? 'preview';
  const showInternalRef = payload.showInternalRef ?? mode === 'preview';

  const tenantName = escapeHtml(payload.tenantName || '');
  const invoiceNumber = escapeHtml(payload.invoiceNumber || '');
  const invoiceId = escapeHtml(payload.invoiceId || '');
  const customerName = escapeHtml(payload.customerName || '');
  const customerCuit = escapeHtml(payload.customerCuit || '');
  const customerCode = escapeHtml(payload.customerCode || '');
  const status = escapeHtml(payload.status || '');

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page { size: A4; margin: 0; }
      html, body {
        margin: 0;
        padding: 0;
        width: ${A4_WIDTH_PX}px;
        height: ${A4_HEIGHT_PX}px;
        background: #ffffff;
        font-family: Arial, sans-serif;
      }
      .sheet {
        box-sizing: border-box;
        width: ${A4_WIDTH_PX}px;
        height: ${A4_HEIGHT_PX}px;
        padding: 24px;
        border: 1px solid #d1d5db;
      }
      .title {
        text-align: center;
        font-size: 48px;
        font-weight: 700;
        margin: 0 0 16px;
      }
      .block {
        border: 1px solid #d1d5db;
        padding: 14px;
        margin-bottom: 14px;
      }
      .label { color: #4b5563; font-size: 20px; margin: 0 0 6px; }
      .value { color: #111827; font-size: 36px; margin: 0 0 10px; font-weight: 700; }
      .line { color: #374151; font-size: 30px; margin: 6px 0; }
      .grid {
        display: grid;
        grid-template-columns: 2.2fr 1fr;
        border: 1px solid #d1d5db;
      }
      .cell { padding: 12px 16px; min-height: 150px; }
      .cell + .cell { border-left: 1px solid #d1d5db; }
      .head {
        background: #f3f4f6;
        border-bottom: 1px solid #d1d5db;
        font-size: 28px;
        font-weight: 700;
      }
      .big-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 16px;
        border: 1px solid #d1d5db;
        margin-top: 16px;
      }
      .big-total .t { font-size: 40px; font-weight: 700; color: #111827; }
      .big-total .v { font-size: 52px; font-weight: 700; color: #111827; }
      .foot {
        margin-top: 20px;
        font-size: 20px;
        color: #6b7280;
        text-align: center;
      }
      .mode {
        margin-top: 10px;
        font-size: 20px;
        color: #9ca3af;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <h1 class="title">FACTURA</h1>
      <div class="block">
        <p class="label">Emisor</p>
        <p class="value">${tenantName}</p>
        <p class="line">Fecha emision: ${issuedAt}</p>
        <p class="line">Factura Nro: ${invoiceNumber}</p>
        ${showInternalRef ? `<p class="line">ID interno: ${invoiceId}</p>` : ''}
      </div>
      <div class="block">
        <p class="value" style="font-size: 42px; margin-bottom: 8px;">Cliente</p>
        <p class="line">${customerName}</p>
        <p class="line">CUIT: ${customerCuit}</p>
        <p class="line">Codigo: ${customerCode}</p>
      </div>
      <div class="grid">
        <div class="head cell">Descripcion</div>
        <div class="head cell">Importe</div>
        <div class="cell">
          <p class="line">Servicios profesionales facturados</p>
          <p class="line" style="margin-top: 36px;">Vencimiento: ${dueDate}</p>
          <p class="line">Estado: ${status}</p>
        </div>
        <div class="cell"><p class="line">$ ${total}</p></div>
      </div>
      <div class="big-total">
        <div>
          <div class="t">Total</div>
          <div class="label">Comprobante generado por Constanza</div>
        </div>
        <div class="v">$ ${total}</div>
      </div>
      <div class="mode">${mode === 'preview' ? 'Documento no fiscal - vista previa' : ''}</div>
      <div class="foot">Este documento puede exportarse como PDF, PNG o JPG.</div>
    </div>
  </body>
</html>`;
}

async function withPage<T>(fn: (page: import('puppeteer-core').Page) => Promise<T>): Promise<T> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: browserExecutablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: A4_WIDTH_PX, height: A4_HEIGHT_PX, deviceScaleFactor: 2 });
    const result = await fn(page);
    return result;
  } finally {
    await browser.close();
  }
}

async function renderImage(payload: InvoiceExportPayload, format: 'png' | 'jpg'): Promise<Buffer> {
  const html = buildInvoiceHtml(payload);
  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    const image = await page.screenshot({
      type: format === 'jpg' ? 'jpeg' : 'png',
      quality: format === 'jpg' ? 92 : undefined,
      fullPage: true,
    });
    return Buffer.from(image);
  });
}

async function renderPdf(payload: InvoiceExportPayload): Promise<Buffer> {
  const html = buildInvoiceHtml(payload);
  return withPage(async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });
    return Buffer.from(pdf);
  });
}

export async function exportInvoiceFile(
  payload: InvoiceExportPayload,
  format: InvoiceExportFormat
): Promise<InvoiceExportResult> {
  const templateSource = 'html-playwright';
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
