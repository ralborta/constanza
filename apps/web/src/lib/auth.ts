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

export function removeToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
}

