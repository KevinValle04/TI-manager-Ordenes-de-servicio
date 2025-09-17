import axios from 'axios';

// Configurar interceptor para añadir token automáticamente a todas las peticiones
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Asegurarse de que existe el objeto headers
      config.headers = config.headers || {};
      // Añadir el token a los headers
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Variable para evitar múltiples redirecciones simultáneas
let isRedirecting = false;

// Interceptor para manejar errores de autenticación
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403) && !isRedirecting) {
      isRedirecting = true;
      
      // Limpiar datos de autenticación
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirigir al login
      alert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      
      setTimeout(() => {
        window.location.href = '/login';
        isRedirecting = false;
      }, 100);
    }
    return Promise.reject(error);
  }
);

export default axios;