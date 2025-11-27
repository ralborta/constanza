export function getNotifierBaseUrl(): string {
  const fallback = 'http://localhost:3001';
  const raw = process.env.NOTIFIER_URL;

  if (!raw && process.env.NODE_ENV === 'production') {
    // En producción, evidenciar que falta la env (evitar fallback silencioso)
    // eslint-disable-next-line no-console
    console.warn('⚠️ NOTIFIER_URL no está configurada. Usando fallback (localhost) en producción.');
  }

  let value = (raw || fallback).trim();

  // Eliminar puntos finales y barras finales accidentales
  value = value.replace(/\.+$/, '').replace(/\/+$/, '');

  // Asegurar esquema si no fue provisto
  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  // Validar que sea una URL válida
  try {
    // new URL lanza si es inválida
    // eslint-disable-next-line no-new
    new URL(value);
    return value;
  } catch {
    // Si había un valor en env pero es inválido, no hacemos fallback silencioso:
    // devolvemos el valor saneado y lo evidenciamos en logs.
    if (raw) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ NOTIFIER_URL inválida: "${raw}". Usando valor saneado: "${value}"`);
      return value;
    }
    // Si no había env, devolvemos el fallback (ya saneado) igualmente con warning.
    // eslint-disable-next-line no-console
    console.warn(`⚠️ NOTIFIER_URL ausente. Usando fallback: "${value}"`);
    return value;
  }
}


