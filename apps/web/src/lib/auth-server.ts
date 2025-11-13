// Server-side auth functions (no 'use client')

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  perfil: 'ADM' | 'OPERADOR_1' | 'OPERADOR_2' | 'CLIENTE';
}

export async function getServerSession(): Promise<User | null> {
  // 🔥 TEMPORAL: Si hay token fake en cookies, permite acceso
  // TODO: Remover cuando Railway esté funcionando
  if (typeof window === 'undefined') {
    // Server-side: verificar cookies
    const { cookies } = await import('next/headers');
    const token = cookies().get('token')?.value;
    
    if (token && token.startsWith('fake-token')) {
      return {
        id: 'fake-user-id',
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@constanza.com',
        perfil: 'ADM',
      };
    }
  }
  
  // Client-side: verificar localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && token.startsWith('fake-token')) {
      return {
        id: 'fake-user-id',
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@constanza.com',
        perfil: 'ADM',
      };
    }
  }
  
  return null;
}

