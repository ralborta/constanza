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
  const response = await axios.post(`${API_URL}/auth/login`, {
    email,
    password,
  });
  return response.data;
}

export async function loginCustomer(email: string, password: string): Promise<AuthResponse> {
  const response = await axios.post(`${API_URL}/auth/customer/login`, {
    email,
    password,
  });
  return response.data;
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

export async function getServerSession() {
  // Server-side session check
  // Por ahora retornamos null, se implementará con cookies
  return null;
}

