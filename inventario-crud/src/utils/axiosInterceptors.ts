import axios from 'axios';
import { toast } from 'react-toastify';


// Configurar interceptor de Axios
export const setupAxiosInterceptors = () => {
  // Interceptor para requests - agregar token automáticamente
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        if (!config.headers) {
          config.headers = {};
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Interceptor para responses - manejar tokens expirados
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        const errorMessage = error.response?.data?.message;
        
        if (errorMessage?.includes('Token') || errorMessage?.includes('token')) {
          // Token expirado o inválido
          localStorage.removeItem('token');
          
          toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
            position: "top-center",
            autoClose: 4000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: false,
            draggable: true,
          });

          // Redirigir al login después de un breve delay
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
      
      return Promise.reject(error);
    }
  );
};
