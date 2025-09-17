// src/utils/axiosInterceptor.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// Configurar headers por defecto
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Lista de rutas que no requieren autenticación
const publicRoutes = [
  'auth/login',
  'auth/register'
];

// Activar el modo de depuración para ver las cabeceras
axios.interceptors.request.use((config) => {
  console.log('Request headers:', config.headers);
  return config;
});

// Configurar interceptor para añadir token automáticamente
axios.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  // Verificar si la ruta es pública
  const url = config.url || '';
  
  // Extraer la ruta relativa después de la URL base
  let relativePath = url;
  if (url.startsWith(API_URL)) {
    relativePath = url.substring(API_URL.length);
  }
  
  // Verificar si es una ruta pública
  const isPublicRoute = publicRoutes.some(route => relativePath.startsWith(route));

  // Si no es una ruta pública, añadir el token
  if (!isPublicRoute) {
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No se encontró token para ruta protegida:', url);
    }
  }

  // Devolver la configuración actualizada
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Variable para evitar múltiples redirecciones
let isRedirecting = false;

// Interceptor para manejar respuestas de error (tokens expirados)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if ((error.response.status === 401 || error.response.status === 403) && !isRedirecting) {
        // Token inválido o expirado
        isRedirecting = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Usar un timeout para evitar problemas de estado
        setTimeout(() => {
          window.location.href = '/login';
          isRedirecting = false;
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default axios;
