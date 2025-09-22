// src/App.tsx
import { useState, useEffect, JSX } from 'react';
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import Proyectos from "./pages/Proyectos";
import Cotizaciones from "./pages/Cotizaciones";
import CotizacionesCanalizacion from "./pages/CotizacionesCanalizacion";
import OrdenesCompra from "./pages/OrdenesCompra";
import Clientes from "./pages/Clientes";
import Proveedores from "./pages/Proveedores";
import RazonesSociales from "./pages/RazonesSociales";
import Vendedores from "./pages/Vendedores";
import MaterialCanalizacion from "./pages/Mat-elec";
import Inventario from "./pages/Inventario";
import InventarioExterior from "./pages/InventarioExterior";
import Guias from "./pages/Guias";
import Colaboradores from "./pages/Colaboradores";
import Papeleria from "./pages/Papeleria";
import Herramientas from "./pages/Herramientas";
import InventoryRequests from "./pages/InventoryRequests";
import SolicitudesHerramientas from "./pages/SolicitudesHerramientas";
import Login from "./components/Login";
import Register from "./components/Register";
import UsuarioConfig from "./pages/UsuarioConfig";
import { jwtDecode } from 'jwt-decode';
import SessionTimeout from './components/SessionTimeout';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = import.meta.env.VITE_API_URL + "auth/";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token');
  
  // Si no hay token, redirigir al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Verificar si el token no ha expirado (validación básica del lado cliente)
  try {
    const decoded: any = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    
    if (decoded.exp < currentTime) {
      // Token expirado, limpiar y redirigir
      localStorage.removeItem('token');
      return <Navigate to="/login" replace />;
    }
  } catch {
    // Token malformado, limpiar y redirigir
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [username, setUsername] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const navigate = useNavigate();

  // Función para validar el token con el servidor
  const validateToken = async (tokenToValidate: string): Promise<boolean> => {
    try {
      const response = await axios.get(`${API_URL}verify-token`, {
        headers: { Authorization: `Bearer ${tokenToValidate}` }
      });
      return (response.data as any).valid;
    } catch (error) {
      return false;
    }
  };

  // Validar token al cargar la aplicación
  useEffect(() => {
    const checkToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setIsValidatingToken(true);
        const isValid = await validateToken(storedToken);
        if (!isValid) {
          // Token inválido o expirado, limpiar datos y redirigir al login
          localStorage.removeItem('token');
          setToken(null);
          setUsername(null);
          toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.', {
            position: "top-center",
            autoClose: 4000,
          });
          navigate('/login');
        } else {
          // Token válido, decodificar para obtener username
          try {
            const decoded: any = jwtDecode(storedToken);
            setUsername(decoded.username);
            setToken(storedToken);
          } catch {
            // Error al decodificar, limpiar datos
            localStorage.removeItem('token');
            setToken(null);
            setUsername(null);
            navigate('/login');
          }
        }
        setIsValidatingToken(false);
      }
    };

    checkToken();
  }, [navigate]);

  // Validar expiración del token cada 5 minutos
  useEffect(() => {
    if (!token) return;

    const checkTokenPeriodically = setInterval(async () => {
      const isValid = await validateToken(token);
      if (!isValid) {
        handleLogout();
        navigate('/login');
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(checkTokenPeriodically);
  }, [token, navigate]);
  
  useEffect(() => {
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        setUsername(decoded.username);
      } catch {
        setUsername(null);
      }
    } else {
      setUsername(null);
    }
  }, [token]);

  const handleLogin = (tok: string, user: string) => {
    localStorage.setItem('token', tok);
    setToken(tok);
    setUsername(user);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUsername(null);
  };
  
  const handleUpdateUser = (newUsername: string) => {
    setUsername(newUsername);
  };

  // Mostrar pantalla de carga mientras se valida el token inicial
  if (isValidatingToken) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Validando sesión...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SessionTimeout 
        token={token} 
        onLogout={handleLogout} 
        timeoutMs={90 * 60 * 1000} // 1.5 horas de inactividad
      />
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onRegister={() => {}} />} />
        <Route path="/" element={<PrivateRoute><MainLayout username={username} onLogout={handleLogout} /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="proyectos" element={<Proyectos />} />
          <Route path="ordenes-compra" element={<OrdenesCompra />} />
          <Route path="cotizaciones" element={<Cotizaciones />} />
          <Route path="cotizaciones-canalizacion" element={<CotizacionesCanalizacion />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="razones-sociales" element={<RazonesSociales />} />
          <Route path="vendedores" element={<Vendedores />} />
          <Route path="mat-elec" element={<MaterialCanalizacion />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="inventarioExterior" element={<InventarioExterior />} />
          <Route path="guias" element={<Guias />} />
          <Route path="colaboradores" element={<Colaboradores />} />
          <Route path="papeleria" element={<Papeleria />} />
          <Route path="herramientas" element={<Herramientas />} />
          <Route path="solicitudes-inventario" element={<InventoryRequests />} />
          <Route path="solicitudes-herramientas" element={<SolicitudesHerramientas />} />
          <Route path="/usuario" element={<UsuarioConfig username={username || ''} onUpdate={handleUpdateUser} />} />

        </Route>
      </Routes>
    </>
  );
}

export default App;
