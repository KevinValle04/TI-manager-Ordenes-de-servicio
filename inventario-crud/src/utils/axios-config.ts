// src/utils/axiosInterceptor.ts
import axios from 'axios';

// Configurar instancia de axios con la URL base
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Lista de rutas que no requieren autenticación
const publicRoutes = [
  'auth/login',
  'auth/register'
];

// Interceptor para añadir el token de autorización
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const url = config.url || '';
    
    // Verificar si la ruta es pública
    const isPublicRoute = publicRoutes.some(route => url.includes(route));

    // Para rutas no públicas, agregar el token si existe
    if (!isPublicRoute && token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log para depuración
      console.log('Request config:', {
        url: config.url,
        method: config.method,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si hay error de autenticación (401) o autorización (403)
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Log del error
      console.error('Error de autenticación:', {
        status: error.response.status,
        message: error.response.data?.message,
        config: {
          url: error.config.url,
          method: error.config.method,
          headers: error.config.headers
        }
      });

      // Limpiar datos de sesión
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Mostrar mensaje al usuario
      alert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');

      // Redirigir al login
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default instance;