import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL + "auth/";

export default function Login({ onLogin }: { onLogin: (token: string, username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      interface LoginResponse {
        token: string;
        username: string;
        isAdmin?: boolean;
      }
      console.log('Intentando iniciar sesión con:', username);
      const res = await axios.post<LoginResponse>(`${API_URL}login`, { username, password });
      
      // Decodificar el token para obtener la información del usuario
      const token = res.data.token;
      const [headerB64, payloadB64] = token.split('.');
      const payload = JSON.parse(atob(payloadB64));
      
      // Si el usuario es 'admin', establecer isAdmin en true
      if (username.toLowerCase() === 'admin') {
        localStorage.setItem('isAdmin', 'true');
      }
      
      console.log('Respuesta del servidor:', {
        token: res.data.token ? 'Token recibido' : 'No token',
        username: res.data.username,
        isAdmin: username.toLowerCase() === 'admin'
      });
      
      onLogin(res.data.token, res.data.username);
      console.log('Token guardado en localStorage:', localStorage.getItem('token'));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="login-container card shadow p-4" style={{ minWidth: 340, maxWidth: 380 }}>
        <h2 className="mb-4 text-center" style={{ color: '#495057' }}>Iniciar Sesión</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="Usuario"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn w-100" style={{ backgroundColor: '#495057', color: '#fff' }}>Entrar</button>
        </form>
        <div className="text-center mt-3">
          <span>¿No tienes cuenta? </span>
          <a href="/register" className="text-decoration-underline" style={{ color: '#495057', cursor: 'pointer' }}>
            Regístrate aquí
          </a>
        </div>
        {error && <div className="alert alert-danger mt-3 mb-0 py-2 text-center">{error}</div>}
      </div>
    </div>
  );
}
