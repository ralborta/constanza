import axios from 'axios';
import { getToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Exportar la URL para usarla en mensajes de error
export const getApiUrl = () => API_URL;

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Para FormData, no modificar Content-Type - axios lo maneja automáticamente
  if (config.data instanceof FormData) {
    // Eliminar Content-Type si fue establecido manualmente
    delete config.headers['Content-Type'];
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido, redirigir a login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

