import type { ContextoCobranza } from './cobranza-context.js';

export interface PoliticasCobranza {
  max_negociaciones?: number;
  plazo_maximo_dias?: number;
  porcentaje_minimo_pago?: number;
  medios_pago_disponibles?: string[];
  horario_contacto_inicio?: string;
  horario_contacto_fin?: string;
  tono_comunicacion?: string;
}

/**
 * Construye el prompt dinámico para el agente de cobranza (OpenAI).
 */
export function construirPromptDinamico(
  contexto: ContextoCobranza,
  mensaje: string,
  politicas: PoliticasCobranza
): string {
  const pol = politicas;
  const medios = Array.isArray(pol.medios_pago_disponibles) ? pol.medios_pago_disponibles.join(', ') : 'transferencia, tarjeta';

  const instrucciones = `
Eres un agente de cobranza profesional, empático y efectivo.

RESPONSABILIDADES:
- Negociar planes de pago flexibles
- Mantener tono profesional pero amable
- Proponer soluciones realistas
- Documentar acuerdos claramente
- Escalar a humano si es necesario

POLÍTICAS DE COBRANZA:
- Máximo ${pol.max_negociaciones ?? 3} negociaciones por deuda
- Plazo máximo de pago: ${pol.plazo_maximo_dias ?? 30} días
- Porcentaje mínimo de pago: ${pol.porcentaje_minimo_pago ?? 25}%
- Medios de pago disponibles: ${medios}
- Horario de contacto: ${pol.horario_contacto_inicio ?? '09:00'} a ${pol.horario_contacto_fin ?? '18:00'}

TONO: ${pol.tono_comunicacion ?? 'profesional_empatico'}
`;

  let contextoEspecifico: string;
  const fmt = (n: number) => (n / 100).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (!contexto.existe_cliente || !contexto.cliente) {
    contextoEspecifico = `
INFORMACIÓN DEL CLIENTE:
- Estado: CLIENTE NUEVO (no existe en sistema)
- Número: ${mensaje ? '(del mensaje entrante)' : ''}

ACCIÓN RECOMENDADA:
- Saludar cordialmente
- Presentar el servicio
- Solicitar información básica
`;
  } else {
    contextoEspecifico = `
INFORMACIÓN DEL CLIENTE:
- Nombre: ${contexto.cliente.nombre}
- Número: ${contexto.cliente.numero}
- Estado: ${contexto.cliente.estado}

DEUDAS ACTIVAS:
${contexto.deudas
  .map(
    (d) => `
  • Factura ${d.numero_factura}
    - Monto original: $${fmt(d.monto_original)}
    - Pendiente: $${fmt(d.monto_pendiente)}
    - Estado: ${d.estado}
    - Vencimiento: ${new Date(d.fecha_vencimiento).toLocaleDateString('es-ES')}
`
  )
  .join('')}

TOTAL DEUDA: $${fmt(contexto.total_deuda)}

${
  contexto.ultimo_acuerdo
    ? `
ACUERDO PREVIO (${contexto.ultimo_acuerdo.dias_desde_acuerdo} días atrás):
- Tipo: ${contexto.ultimo_acuerdo.tipo}
- Monto acordado: $${fmt(contexto.ultimo_acuerdo.monto_acordado)}
${contexto.ultimo_acuerdo.porcentaje ? `- Porcentaje: ${contexto.ultimo_acuerdo.porcentaje}%` : ''}
- Fecha de pago: ${new Date(contexto.ultimo_acuerdo.fecha_pago_acordada).toLocaleDateString('es-ES')}
- Estado: ${contexto.ultimo_acuerdo.estado}
`
    : `
ACUERDO PREVIO: Ninguno
`
}
`;
  }

  const mensajeActual = `
MENSAJE DEL CLIENTE:
"${mensaje}"

INSTRUCCIONES PARA ESTA RESPUESTA:
1. Reconoce el contexto previo (si existe acuerdo)
2. Responde de manera natural y conversacional
3. Si el cliente pregunta sobre pago: propón opciones realistas, menciona medios disponibles, sugiere fechas viables
4. Si el cliente incumple acuerdo: sé empático pero firme, propón renegociación, documenta el cambio
5. Si es cliente nuevo: presenta opciones de pago, solicita datos de contacto
6. Siempre cierra con una pregunta o llamada a acción clara

FORMATO DE RESPUESTA:
- Máximo 3 párrafos
- Lenguaje claro y directo
- Evita jerga legal
- Sé específico con montos y fechas
`;

  return `${instrucciones}${contextoEspecifico}${mensajeActual}`;
}
