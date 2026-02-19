import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_POLITICAS: Record<string, unknown> = {
  max_negociaciones: 3,
  plazo_maximo_dias: 30,
  porcentaje_minimo_pago: 25,
  medios_pago_disponibles: ['transferencia', 'tarjeta', 'efectivo'],
  horario_contacto_inicio: '09:00',
  horario_contacto_fin: '18:00',
  tono_comunicacion: 'profesional_empatico',
};

/**
 * Lee políticas de cobranza del tenant desde la BD (core.policy_rules).
 * Así el notifier no depende de API_GATEWAY_URL ni AGENT_API_KEY.
 */
export async function getPoliticasCobranza(tenantId: string): Promise<Record<string, unknown>> {
  const rows = await prisma.policyRule.findMany({
    where: { tenantId },
  });

  const result: Record<string, unknown> = { ...DEFAULT_POLITICAS };
  for (const p of rows) {
    const key = p.key.startsWith('cobranza:') ? p.key.replace('cobranza:', '') : p.key;
    try {
      result[key] = typeof p.valueJson === 'object' ? p.valueJson : JSON.parse(String(p.valueJson));
    } catch {
      result[key] = p.valueJson;
    }
  }
  return result;
}
