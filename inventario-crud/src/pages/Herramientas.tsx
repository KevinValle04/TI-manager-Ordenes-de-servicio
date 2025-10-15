import React, { useState, useEffect } from 'react';
import { Collapse, message } from 'antd';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import HerramientaList from '../components/colaboradores/HerramientaList';

interface Colaborador {
  _id: string;
  numeroEmpleado: number;
  nombre: string;
  fotografia?: string;
}

interface Herramienta {
  _id: string;
  nombre: string;
  marca: string;
  modelo: string;
  valor: number;
  serialNumber: string;
  fechaAsignacion: string;
}

const Herramientas: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [herramientas, setHerramientas] = useState<{ [key: string]: Herramienta[] }>({});
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAdmin(false);
      return;
    }
    try {
      const payload = jwtDecode<{ isAdmin?: boolean }>(token);
      setIsAdmin(!!payload?.isAdmin);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const fetchColaboradores = async () => {
    try {
      const response = await axios.get<Colaborador[]>('http://localhost:6051/api/colaboradores');
      if (Array.isArray(response.data)) {
        setColaboradores(response.data);
      } else {
        console.error('La respuesta no es un array:', response.data);
        setColaboradores([]);
        message.error('Error en el formato de datos de colaboradores');
      }
    } catch (error) {
      console.error('Error al cargar colaboradores:', error);
      setColaboradores([]);
      message.error('Error al cargar colaboradores');
    }
  };

  const fetchHerramientas = async (colaboradorId: string) => {
    try {
      const response = await axios.get<Herramienta[]>(
        `http://localhost:6051/api/herramientas/colaborador/${colaboradorId}`
      );
      setHerramientas(prev => ({
        ...prev,
        [colaboradorId]: response.data
      }));
    } catch (error) {
      console.error('Error al cargar herramientas:', error);
      message.error('Error al cargar herramientas');
    }
  };

  useEffect(() => {
    fetchColaboradores();
  }, []);

  const handlePanelChange = (key: string | string[]) => {
    const colaboradorId = Array.isArray(key) ? key[key.length - 1] : key;
    if (colaboradorId && !herramientas[colaboradorId]) {
      fetchHerramientas(colaboradorId);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="mb-4">
        <h1>Herramientas</h1>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Collapse
          onChange={handlePanelChange}
          items={colaboradores.map(colaborador => ({
            key: colaborador._id,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img 
                  src={colaborador.fotografia ? 
                    `http://localhost:6051/api/colaboradores/foto/${colaborador.fotografia.split('/').pop()}` 
                    : '/test.png'
                  } 
                  alt={colaborador.nombre}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = '/test.png';
                  }}
                />
                <span>ID: {colaborador.numeroEmpleado} - {colaborador.nombre}</span>
              </div>
            ),
            children: (
              <HerramientaList
                colaboradorId={colaborador._id}
                herramientas={herramientas[colaborador._id] || []}
                onHerramientasChange={() => fetchHerramientas(colaborador._id)}
                isAdmin={isAdmin}
              />
            )
          }))}
        />
      </div>
    </div>
  );
};

export default Herramientas;
