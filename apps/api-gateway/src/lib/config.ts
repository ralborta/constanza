export function getNotifierBaseUrl(): string {
  const fallback = 'http://localhost:3001';
  let value = (process.env.NOTIFIER_URL || fallback).trim();

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
    return fallback;
  }
}


