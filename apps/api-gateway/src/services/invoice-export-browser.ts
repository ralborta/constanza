import puppeteer from 'puppeteer-core';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

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

const TEMPLATE_IMG_WIDTH = 724;
const TEMPLATE_IMG_HEIGHT = 1024;
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const LOCAL_TEMPLATE_PATH = '/Users/ralborta/Constanza/apps/api-gateway/src/assets/factura-template.png';

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

function templateCandidates(): string[] {
  const cwd = process.cwd();
  return [
    process.env.INVOICE_TEMPLATE_IMAGE_PATH || '',
    LOCAL_TEMPLATE_PATH,
    join(cwd, 'apps/api-gateway/src/assets/factura-template.png'),
    join(cwd, 'src/assets/factura-template.png'),
  ].filter((p) => p.length > 0);
}

async function loadTemplateDataUrl(): Promise<{ dataUrl: string; source: string }> {
  for (const candidate of templateCandidates()) {
    try {
      const raw = await readFile(candidate);
      const b64 = raw.toString('base64');
      return {
        dataUrl: `data:image/png;base64,${b64}`,
        source: candidate,
      };
    } catch {
      // try next
    }
  }
  throw new Error('No se encontro factura-template.png en rutas conocidas');
}

function browserExecutablePath(): string | undefined {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    process.env.CHROMIUM_PATH ||
    '/usr/bin/chromium'
  );
}

function buildInvoiceHtml(payload: InvoiceExportPayload, templateDataUrl: string): string {
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
      .page {
        width: ${A4_WIDTH_PX}px;
        height: ${A4_HEIGHT_PX}px;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding-top: 12px;
        box-sizing: border-box;
      }
      .sheet {
        width: ${TEMPLATE_IMG_WIDTH}px;
        height: ${TEMPLATE_IMG_HEIGHT}px;
        position: relative;
      }
      .bg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .v {
        position: absolute;
        color: #2f3541;
        font-size: 18px;
        line-height: 1;
        background: transparent;
        padding: 0;
        white-space: nowrap;
      }
      .small { font-size: 14px; }
      .money { font-size: 28px; font-weight: 700; letter-spacing: 0.3px; }
      .status { font-size: 13px; color: #596273; }
      .wrap {
        max-width: 250px;
        white-space: normal;
        line-height: 1.15;
      }
      .hide-preview { display: ${mode === 'preview' ? 'none' : 'block'}; }
      .hide-fiscal { display: ${mode === 'fiscal' ? 'none' : 'block'}; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="sheet">
        <img class="bg" src="${templateDataUrl}" alt="Plantilla factura" />

        <div class="v small wrap" style="left:182px; top:165px; max-width:200px;">${tenantName}</div>
        <div class="v small" style="left:504px; top:166px;">00003</div>
        <div class="v small" style="left:504px; top:200px;">${invoiceNumber}</div>
        <div class="v small" style="left:504px; top:234px;">${issuedAt}</div>
        <div class="v small" style="left:504px; top:268px;">${dueDate}</div>

        <div class="v small wrap" style="left:200px; top:336px; max-width:410px;">${customerName}</div>
        <div class="v small" style="left:196px; top:370px;">${customerCuit}</div>
        <div class="v small wrap" style="left:505px; top:370px; max-width:145px;">${customerCode}</div>

        <div class="v small wrap" style="left:144px; top:486px; max-width:260px;">Servicios profesionales facturados</div>
        <div class="v small" style="left:432px; top:486px;">1,00</div>
        <div class="v small" style="left:510px; top:486px;">${total}</div>
        <div class="v small" style="left:593px; top:486px;">${total}</div>

        <div class="v small" style="left:492px; top:817px;">${total}</div>
        <div class="v small" style="left:492px; top:849px;">${mode === 'fiscal' ? '' : '0,00'}</div>
        <div class="v small" style="left:492px; top:881px;">${mode === 'fiscal' ? '' : '0,00'}</div>
        <div class="v money" style="left:492px; top:910px;">${total}</div>

        ${showInternalRef ? `<div class="v small hide-fiscal" style="left:72px; top:959px;">${invoiceId}</div>` : ''}
        <div class="v status" style="left:322px; top:959px;">${status}</div>
        <div class="v status hide-fiscal" style="left:566px; top:959px;">Vista previa</div>
      </div>
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
  const template = await loadTemplateDataUrl();
  const html = buildInvoiceHtml(payload, template.dataUrl);
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
  const template = await loadTemplateDataUrl();
  const html = buildInvoiceHtml(payload, template.dataUrl);
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
  const template = await loadTemplateDataUrl();
  const templateSource = template.source;
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
