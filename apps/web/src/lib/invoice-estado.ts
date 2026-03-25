/**
 * Estado mostrado en UI: si el saldo aplicado cubre el monto, se trata como cobrada
 * aunque `estado` en BD siga en ABIERTA (datos previos a la sincronización en servidor).
 */
export function resolveInvoiceEstadoForDisplay(
  estado: string,
  monto: number,
  montoAplicado: number
): string {
  if (monto > 0 && montoAplicado >= monto) {
    return 'SALDADA';
  }
  return estado;
}
