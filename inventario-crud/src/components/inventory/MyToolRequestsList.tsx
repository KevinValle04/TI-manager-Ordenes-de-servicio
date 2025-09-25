import { useState, useEffect } from 'react';
import { Table, Tag, message } from 'antd';
import axios from 'axios';

const MyToolRequestsList = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setRequests([]);
        return;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}solicitudes/herramientas/mis-solicitudes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      message.error('Error al cargar las solicitudes de herramientas.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const [detailsModal, setDetailsModal] = useState<{ visible: boolean, solicitud: any | null }>({ visible: false, solicitud: null });

  const columns = [
    { title: 'Fecha', dataIndex: 'fecha', key: 'fecha', render: (v: string) => new Date(v).toLocaleDateString() },
    { title: 'Tipo', dataIndex: 'accion', key: 'accion', render: (accion: string) => {
      const tipoColors: { [key: string]: string } = {
        'Agregar': 'blue',
        'Modificar': 'orange',
        'Regresar': 'red',
        'Asignar': 'green',
        'Remover': 'volcano',
        'alta': 'blue',
        'baja': 'red',
        'asignar': 'green',
        'remover': 'volcano'
      };
      return <Tag color={tipoColors[accion] || 'default'}>{accion}</Tag>;
    } },
    { title: 'Herramienta', dataIndex: 'recursoNombre', key: 'recursoNombre' },
    { title: 'Marca', dataIndex: 'marca', key: 'marca' },
    { title: 'Modelo', dataIndex: 'modelo', key: 'modelo' },
    { title: 'Serial', dataIndex: 'serialNumber', key: 'serialNumber' },
    { title: 'Colaborador', dataIndex: 'colaboradorNombre', key: 'colaboradorNombre' },
    { title: 'Estado', dataIndex: 'estado', key: 'estado', render: (estado: string) => {
      const statusColors: { [key: string]: string } = { 'pendiente': 'gold', 'aprobada': 'green', 'rechazada': 'red' };
      return <Tag color={statusColors[estado?.toLowerCase()] || 'default'}>{estado}</Tag>;
    } },
    { title: 'Detalles', key: 'detalles', render: (_: any, record: any) => (
      <a onClick={() => setDetailsModal({ visible: true, solicitud: record })}>Ver detalles</a>
    ) }
  ];

  return (
    <>
      <Table
        columns={columns}
        dataSource={requests}
        loading={loading}
        rowKey={r => r._id}
        pagination={{ pageSize: 10 }}
      />
      {detailsModal.visible && (
        <div className="modal-details" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 350, maxWidth: 500 }}>
            <h4>Detalles de la Solicitud</h4>
            <p><strong>Fecha:</strong> {detailsModal.solicitud && new Date(detailsModal.solicitud.fecha).toLocaleDateString()}</p>
            <p><strong>Tipo:</strong> {detailsModal.solicitud?.accion}</p>
            <p><strong>Herramienta:</strong> {detailsModal.solicitud?.recursoNombre}</p>
            <p><strong>Marca:</strong> {detailsModal.solicitud?.marca}</p>
            <p><strong>Modelo:</strong> {detailsModal.solicitud?.modelo}</p>
            <p><strong>Serial:</strong> {detailsModal.solicitud?.serialNumber}</p>
            <p><strong>Colaborador:</strong> {detailsModal.solicitud?.colaboradorNombre}</p>
            <p><strong>Estado:</strong> {detailsModal.solicitud?.estado}</p>
            {detailsModal.solicitud?.detallesOriginal && (
              <div style={{ marginTop: 12 }}>
                <strong>Valores Originales:</strong>
                <pre style={{ background: '#f8f8f8', padding: 8, borderRadius: 4 }}>{JSON.stringify(detailsModal.solicitud.detallesOriginal, null, 2)}</pre>
              </div>
            )}
            <div style={{ textAlign: 'right', marginTop: 16 }}>
              <button onClick={() => setDetailsModal({ visible: false, solicitud: null })} style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: '#007bff', color: '#fff' }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MyToolRequestsList;
