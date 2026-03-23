/**
 * Genera docs/DESCRIPCION_FUNCIONAL_PLATAFORMA.docx
 * Ejecutar: node scripts/generar-descripcion-word.mjs
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../docs/DESCRIPCION_FUNCIONAL_PLATAFORMA.docx');

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, ...opts })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 100 },
    children: [new TextRun({ text, bold: true })],
  });
}

const children = [
  new Paragraph({
    spacing: { after: 200 },
    children: [
      new TextRun({
        text: 'CONSTANZA — PLATAFORMA DE GESTIÓN DE COBRANZAS',
        bold: true,
        size: 32,
      }),
    ],
  }),
  p('Descripción funcional', { italics: true }),

  h2('Qué es'),
  p(
    'Constanza es una plataforma de gestión de cobranzas. Está pensada para equipos que necesitan organizar y hacer seguimiento del cobro de facturas, la relación con quienes deben y la operación diaria en un solo lugar. Cada empresa trabaja en su propio entorno: los datos quedan separados por organización.'
  ),
  p(
    'La gestión de cobranzas es el eje central: facturas, clientes, pagos entrantes, conciliación y comunicación con deudores, todo alineado a ese objetivo.'
  ),

  h2('Integración con ERP y otros sistemas'),
  p(
    'La plataforma puede integrarse con sistemas ERP y con otras herramientas de la empresa (por ejemplo, para sincronizar clientes, facturas o referencias contables). Las integraciones concretas dependen del proyecto: APIs, archivos de intercambio o conectores según lo que use cada cliente. El objetivo es que la gestión de cobranzas no quede aislada del resto de los datos de la empresa.'
  ),

  h2('Operaciones'),
  p('• Panel de control — Indicadores y resumen de la cartera y la actividad.'),
  p(
    '• Facturas — Alta, consulta y seguimiento de comprobantes; ingreso manual o por archivos según la configuración.'
  ),
  p(
    '• Clientes — Cartera asociada a la cobranza: datos de contacto, identificadores de negocio y vínculo con facturas.'
  ),
  p(
    '• Ingresos por transferencias bancarias — Visualización de pagos recibidos por transferencia (referencias, montos, estado). Puede apoyarse en interconexión bancaria (avisos automáticos de depósitos entrantes) para reflejar movimientos sin cargar todo a mano.'
  ),
  p('• Eventos y trabajos programados — Tareas de fondo y procesos batch según el despliegue.'),

  h2('Finanzas y conciliación (gestión de cobranzas)'),
  p(
    '• Transferencias bancarias — Listado de ingresos por transferencia y enlace a facturas cuando corresponda.'
  ),
  p(
    '• Conciliación de pagos — Imputación de pagos a facturas cuando el movimiento llegó sin asignación automática, manteniendo trazabilidad entre cobro y documento. Es parte central de una buena gestión de cobranzas.'
  ),

  h2('Comunicaciones'),
  p('• Envío de mensajes — Notificaciones por lotes o puntuales, con seguimiento.'),
  p('• Llamadas — Flujos de carga de lotes, ejecución y listados según configuración.'),

  h2('Administración'),
  p(
    '• Usuarios internos — Alta y edición de cuentas del equipo, perfiles (administrador u operadores) y empresa asociada, para que cada usuario vea solo lo que corresponde a su organización.'
  ),
  p(
    '• Ajustes de empresa — Parámetros propios (por ejemplo, validación de ingresos frente a la cuenta de cobro en la interconexión bancaria).'
  ),

  h2('Seguridad y organización'),
  p(
    'Los datos se administran por empresa. El acceso se controla con autenticación y roles: no todas las funciones están disponibles para todos los perfiles.'
  ),

  h2('En una frase'),
  p(
    'Constanza es una plataforma de gestión de cobranzas que concentra facturación, seguimiento de deudores, reconocimiento de pagos vía banco, conciliación con facturas y comunicación, pudiendo además integrarse con ERP y sistemas internos para mantener la información alineada.',
    { italics: true }
  ),
];

const doc = new Document({
  sections: [
    {
      properties: {},
      children,
    },
  ],
});

const buf = await Packer.toBuffer(doc);
writeFileSync(outPath, buf);
console.log('Generado:', outPath);
