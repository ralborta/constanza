// Server-side auth functions (no 'use client')

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  perfil: 'ADM' | 'OPERADOR_1' | 'OPERADOR_2' | 'CLIENTE';
}

export async function getServerSession(): Promise<User | null> {
  // Server-side session check
  // Por ahora retornamos null, se implementará con cookies
  return null;
}

