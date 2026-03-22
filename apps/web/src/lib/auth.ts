'use client';

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  perfil: 'ADM' | 'OPERADOR_1' | 'OPERADOR_2' | 'CLIENTE';
}

export interface AuthResponse {
  token: string;
  user?: User;
  customer?: {
    id: string;
    razonSocial: string;
    email: string;
    perfil: 'CLIENTE';
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  // Log para debuggear
  console.log('🔍 Login attempt:', { email, apiUrl: API_URL });
  
  // 🔥 TEMPORAL: Usuario fake para desarrollo sin backend
  // TODO: Remover cuando Railway esté funcionando
  if (email === 'admin@constanza.com' && password === 'admin123') {
    console.log('✅ Usando usuario fake');
    const fakeToken = 'fake-token-' + Date.now();
    return {
      token: fakeToken,
      user: {
        id: 'fake-user-id',
        nombre: 'Admin',
        apellido: 'Sistema',
        email: 'admin@constanza.com',
        perfil: 'ADM',
      },
    };
  }

  // Intenta login real con backend
  try {
    console.log('🌐 Intentando login con backend:', `${API_URL}/auth/login`);
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });
    console.log('✅ Login exitoso:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error en login:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
    });
    // Si falla el backend, permite el usuario fake
    throw error;
  }
}

export async function loginCustomer(email: string, password: string): Promise<AuthResponse> {
  // 🔥 TEMPORAL: Cliente fake para desarrollo sin backend
  // TODO: Remover cuando Railway esté funcionando
  if (email === 'cliente@acme.com' && password === 'cliente123') {
    const fakeToken = 'fake-token-customer-' + Date.now();
    return {
      token: fakeToken,
      customer: {
        id: 'fake-customer-id',
        razonSocial: 'Acme Inc',
        email: 'cliente@acme.com',
        perfil: 'CLIENTE',
      },
    };
  }

  // Intenta login real con backend
  try {
    const response = await axios.post(`${API_URL}/auth/customer/login`, {
      email,
      password,
    });
    return response.data;
  } catch (error: any) {
    // Si falla el backend, permite el cliente fake
    throw error;
  }
}

export function setToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
}

const SESSION_USER_KEY = 'constanza_session_user';

/** Guarda usuario devuelto por POST /auth/login (para menú / permisos en cliente). */
export function setSessionUser(user: User | null) {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_USER_KEY);
  }
}

export function getSessionUser(): User | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): { perfil?: string } | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  try {
    return JSON.parse(atob(padded)) as { perfil?: string };
  } catch {
    return null;
  }
}

/** Perfil para UI (sidebar): sesión guardada o payload JWT. */
export function getEffectivePerfil(): 'ADM' | 'OPERADOR_1' | 'OPERADOR_2' | 'CLIENTE' | null {
  if (typeof window === 'undefined') return null;
  const fromStore = getSessionUser();
  if (fromStore?.perfil) return fromStore.perfil;
  const t = getToken();
  if (!t) return null;
  if (t.startsWith('fake-token')) return 'ADM';
  const payload = decodeJwtPayload(t);
  const p = payload?.perfil;
  if (p === 'ADM' || p === 'OPERADOR_1' || p === 'OPERADOR_2' || p === 'CLIENTE') return p;
  return null;
}

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    setSessionUser(null);
  }
}

