/**
 * Genera docs/DESCRIPCION_FUNCIONAL_PLATAFORMA.docx — descripción detallada para cliente.
 * Ejecutar: pnpm doc:descripcion   (o: node scripts/generar-descripcion-word.mjs)
 */
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../docs/DESCRIPCION_FUNCIONAL_PLATAFORMA.docx');

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text, ...opts })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 90 },
    children: [new TextRun({ text, bold: true })],
  });
}

const children = [
  new Paragraph({
    spacing: { after: 160 },
    children: [
      new TextRun({
        text: 'CONSTANZA',
        bold: true,
        size: 36,
      }),
    ],
  }),
  new Paragraph({
    spacing: { after: 100 },
    children: [
      new TextRun({
        text: 'Plataforma de gestión de cobranzas',
        bold: true,
        size: 28,
      }),
    ],
  }),
  p(
    'Documento descriptivo para cliente — Versión detallada',
    { italics: true, size: 22 }
  ),
  p(
    'Este documento presenta, en forma clara y completa, el alcance funcional de Constanza como solución de gestión de cobranzas: qué problemas ayuda a resolver, qué módulos incluye, cómo se organiza la información y cómo puede convivir con los sistemas que ya utiliza su organización.',
    { size: 22 }
  ),

  h2('1. Resumen ejecutivo'),
  p(
    'Constanza es una plataforma de gestión de cobranzas pensada para equipos que deben administrar de forma ordenada el ciclo: emisión o registro de obligaciones de pago, seguimiento de clientes deudores, recepción e identificación de cobros —en especial por vía bancaria— y conciliación con la facturación. Centraliza la operación diaria, reduce retrabajo manual y ofrece una vista unificada del estado de la cartera y de las acciones de cobro.'
  ),
  p(
    'Cada organización opera en un entorno propio: los datos de una empresa no se mezclan con los de otra. La plataforma se apoya en perfiles de usuario (administración, operadores con distintos niveles de acceso) para que cada integrante del equipo vea y modifique solo lo que corresponde a su rol.'
  ),

  h2('2. Necesidades de negocio que cubre'),
  h3('Visibilidad de la cartera'),
  p(
    'Muchas organizaciones gestionan cobranzas con planillas dispersas, correos y sistemas que no conversan entre sí. Constanza reúne facturas abiertas, clientes y movimientos de cobro en un solo lugar, lo que facilita priorizar casos, responder consultas y coordinar al equipo.'
  ),
  h3('Menos errores y menos carga operativa'),
  p(
    'Al registrar pagos entrantes y vincularlos a facturas, se reduce el riesgo de aplicar un cobro a la cuenta equivocada o de duplicar registros. Cuando existe interconexión con la banca (recepción automática de avisos de depósitos o transferencias), el equipo deja de reingresar a mano cada movimiento que ya conoce el banco.'
  ),
  h3('Trazabilidad'),
  p(
    'Cada pago puede relacionarse con una o más facturas, con registro de montos, fechas y origen del dato. Eso apoya auditorías internas, respuestas al cliente y la continuidad del trabajo si cambia la persona responsable.'
  ),
  h3('Comunicación con deudores'),
  p(
    'La gestión de cobranzas no es solo “saber cuánto falta cobrar”: suele incluir recordatorios, mensajes y contactos telefónicos. La plataforma contempla flujos de comunicación masiva y seguimiento, según la configuración del proyecto.'
  ),

  h2('3. Alcance: gestión de cobranzas de punta a punta'),
  p(
    'El eje de Constanza es la gestión de cobranzas en sentido amplio: no reemplaza por sí sola un sistema contable completo ni un ERP entero, pero sí concentra lo necesario para que el área de cobranzas trabaje con información actualizada sobre quién debe, por qué concepto, qué ingresó en la cuenta y qué falta imputar o liquidar.'
  ),
  p(
    'Desde el registro de clientes y facturas hasta la conciliación con transferencias bancarias y la comunicación con deudores, los flujos están pensados para encadenarse: un mismo usuario puede pasar de ver el listado de facturas pendientes a revisar los ingresos del día y completar la imputación que faltaba.'
  ),

  h2('4. Módulos y funcionalidades principales'),

  h3('4.1 Panel de control (dashboard)'),
  p(
    'Ofrece una vista sintética del estado de la operación: por ejemplo, volumen de facturas abiertas, indicadores de interacción o actividad reciente, según lo implementado en su entorno. Sirve como punto de entrada para decidir en qué enfocarse en la jornada.'
  ),

  h3('4.2 Facturas'),
  p(
    'Permite dar de alta y consultar comprobantes vinculados a clientes: números, importes, vencimientos y estado (abierta, cerrada u otros según el modelo de datos). Según la configuración, puede admitirse carga manual, integración por archivos o sincronización con sistemas externos. La factura es la pieza central a la que se aplican los cobros reconocidos.'
  ),

  h3('4.3 Clientes (cartera de deudores)'),
  p(
    'La cartera registra a quienes se les factura y se les cobra: razón social, datos de contacto, identificadores de negocio (por ejemplo códigos o claves que usan en transferencias o en su relación comercial) y vínculo con las facturas emitidas. Un cliente bien cargado facilita la conciliación automática o semiautomática cuando el banco informa pagos con referencias o datos que permiten identificar al pagador.'
  ),

  h3('4.4 Ingresos y transferencias bancarias'),
  p(
    'Este módulo concentra los pagos recibidos por transferencia bancaria: referencias, montos, fechas y estado (por ejemplo aplicado a factura, pendiente de liquidación o pendiente de imputación). Cuando la organización dispone de interconexión bancaria —es decir, recepción automática de avisos del banco sobre depósitos o transferencias entrantes— esos movimientos pueden incorporarse a la plataforma sin regrabarlos manualmente, ganando tiempo y precisión.'
  ),
  p(
    'La visualización está pensada para que el equipo identifique rápidamente qué ingreso corresponde a qué situación comercial y qué acción falta (por ejemplo imputar a una factura concreta). En pantallas con mucha información, la interfaz permite revisar los datos clave sin perder el contexto.'
  ),

  h3('4.5 Conciliación de pagos'),
  p(
    'No siempre el banco entrega el dato ya “etiquetado” con la factura exacta. El proceso de conciliación permite asociar un ingreso reconocido con una o más facturas, respetando montos y dejando constancia de la aplicación. Es un paso central de la gestión de cobranzas: cerrar el circuito entre “entró dinero” y “quedó saldada o actualizada la obligación en el sistema”.'
  ),

  h3('4.6 Comunicaciones: mensajes y llamadas'),
  p(
    'El seguimiento de cobranzas suele incluir notificaciones a clientes (recordatorios de vencimiento, informes de saldo) y campañas de contacto. La plataforma contempla envío de mensajes por lotes con seguimiento de avance, así como flujos relacionados con llamadas: carga de lotes, ejecución y listados, de acuerdo con la configuración desplegada para su organización.'
  ),

  h3('4.7 Administración de usuarios y empresa'),
  p(
    'Los administradores pueden dar de alta usuarios internos, asignar perfiles (por ejemplo administrador frente a operadores con permisos distintos) y definir a qué empresa pertenece cada cuenta. Así se garantiza que cada persona acceda solo a la información de su organización. También existen ajustes propios de la empresa —como parámetros para validar ingresos frente a la cuenta de cobro configurada en la interconexión bancaria— que refuerzan la coherencia entre lo que muestra el banco y lo que espera el equipo de cobranzas.'
  ),

  h2('5. Integración con ERP y con el ecosistema de sistemas'),
  p(
    'En la práctica, la gestión de cobranzas rara vez vive aislada: los datos de clientes y facturas suelen nacer o actualizarse en un ERP, en un sistema de facturación electrónica o en planillas maestras. Constanza puede integrarse con esos sistemas mediante distintos mecanismos, según el proyecto: APIs, archivos de intercambio programados, conectores específicos o procesos de importación/exportación.'
  ),
  p(
    'El objetivo no es duplicar todo el ERP, sino asegurar que la información relevante para cobrar —quién debe, cuánto, bajo qué documento— llegue de forma consistente a la plataforma de cobranzas y, cuando haga falta, que los estados de cobro puedan retroalimentar al resto del ecosistema. El diseño concreto de integraciones (qué entidad se manda, cada cuánto, con qué validaciones) se define en el marco de cada implementación con su cliente.'
  ),

  h2('6. Seguridad, organización y confidencialidad'),
  p(
    'Los datos se organizan por empresa: usuarios, clientes, facturas y pagos quedan acotados al contexto de la organización correspondiente. El acceso se protege mediante autenticación y roles: no todas las funciones están disponibles para todos los perfiles; por ejemplo, ciertas tareas administrativas o sensibles pueden reservarse a usuarios con permisos de administrador.'
  ),
  p(
    'Esta separación es especialmente relevante cuando el proveedor de la solución aloja a varias organizaciones en la misma infraestructura técnica: lógicamente, cada una permanece aislada.'
  ),

  h2('7. Beneficios que la organización puede esperar'),
  p(
    '• Mayor claridad sobre el estado real de la cartera y de los cobros del período.'
  ),
  p(
    '• Reducción de trabajo repetitivo al automatizar el ingreso de movimientos bancarios cuando hay interconexión.'
  ),
  p(
    '• Mejor coordinación del equipo de cobranzas al trabajar sobre los mismos datos actualizados.'
  ),
  p(
    '• Base más sólida para responder a clientes internos y externos sobre saldos y aplicaciones de pago.'
  ),
  p(
    '• Preparación para integrar la operación de cobranzas con el ERP y otros sistemas sin depender solo de planillas aisladas.'
  ),

  h2('8. Sobre la implementación (visión general)'),
  p(
    'El despliegue concreto —entornos, integraciones, migración de datos iniciales y capacitación— se planifica caso por caso. Este documento describe la capacidad funcional de la plataforma; los plazos, alcance técnico exacto y responsabilidades se formalizan en la propuesta o contrato de servicios correspondiente a cada cliente.'
  ),

  h2('9. Cierre'),
  p(
    'Constanza es una plataforma de gestión de cobranzas que permite a su organización ordenar el circuito desde la factura y el cliente hasta el reconocimiento del pago en cuenta y su conciliación con la obligación correspondiente, complementada con comunicación a deudores y con posibilidad de integración con ERP y sistemas internos. Si desea profundizar en algún módulo o en un escenario particular de su negocio, ese detalle puede desarrollarse en una reunión o documento anexo específico.',
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
