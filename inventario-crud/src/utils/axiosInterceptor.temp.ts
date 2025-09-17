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

// Configurar interceptor para añadir token automáticamente
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const url = config.url || '';
    
    // Extraer la ruta relativa después de la URL base
    let relativePath = url;
    if (url.startsWith(API_URL)) {
      relativePath = url.substring(API_URL.length);
    }
    
    // Verificar si la ruta es pública
    const isPublicRoute = publicRoutes.some(route => relativePath.startsWith(route));

    // Para rutas no públicas, agregar el token si existe
    if (!isPublicRoute && token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    console.error('Error en interceptor de request:', error);
    return Promise.reject(error);
  }
);

let isRedirecting = false;

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('Error en respuesta:', {
        status: error.response.status,
        data: error.response.data,
        config: error.config
      });

      if ((error.response.status === 401 || error.response.status === 403) && !isRedirecting) {
        console.log('Token inválido o expirado, redirigiendo al login...');
        isRedirecting = true;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
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