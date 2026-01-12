import axios from 'axios';
import { getToken } from './auth';

// La variable de entorno DEBE estar configurada en Vercel
// En desarrollo local, usar localhost como fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || 
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '');

// Log para debuggear (solo en cliente)
if (typeof window !== 'undefined') {
  console.log('🔍 API_URL configurada:', API_URL);
  console.log('🔍 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('🔍 NODE_ENV:', process.env.NODE_ENV);
}

// Validar en producción que la variable esté configurada
if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
  console.error('❌ ERROR: NEXT_PUBLIC_API_URL no está configurada en Vercel. Las requests fallarán.');
}

// Validar en desarrollo que la variable esté configurada
if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn('⚠️ NEXT_PUBLIC_API_URL no está configurada. Usando fallback localhost:3000');
}

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
      // Token inválido o expirado
      // Solo redirigir si no estamos ya en la página de login
      // y si la URL no es un endpoint opcional (como summary que puede fallar)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        const url = error.config?.url || '';
        // Endpoints opcionales que pueden fallar sin redirigir
        const optionalEndpoints = ['/summary', '/summary/update'];
        const isOptionalEndpoint = optionalEndpoints.some(endpoint => url.includes(endpoint));
        
        if (!isOptionalEndpoint) {
          // Limpiar token y redirigir
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

