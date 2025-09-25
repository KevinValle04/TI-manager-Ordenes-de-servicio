import { useState, useEffect } from 'react';
import { Table, Tag, Modal, message, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { TablePaginationConfig } from 'antd/es/table';
import axios from 'axios';

const InventoryRequestsTable = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<TablePaginationConfig>({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setRequests([]);
        return;
      }
      const response = await axios.get(`${import.meta.env.VITE_API_URL}inventory-requests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setRequests(response.data);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      message.error('Error al cargar las solicitudes de inventario.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleTableChange = (newPagination: TablePaginationConfig) => {
    setPagination(newPagination);
  };

  const getStatusTag = (estado: string) => {
    const statusColors: { [key: string]: string } = {
      'PENDIENTE': 'gold',
      'APROBADA': 'green',
      'RECHAZADA': 'red'
    };
    return (
      <Tag color={statusColors[estado]}>
        {estado}
      </Tag>
    );
  };

  const showRequestDetails = (record: any) => {
    Modal.info({
      title: 'Detalles de la Solicitud',
      content: (
        <div>
          <p><strong>Fecha:</strong> {new Date(record.fechaSolicitud).toLocaleDateString('es-MX')}</p>
          <p><strong>Tipo:</strong> {record.tipoMovimiento}</p>
          <p><strong>Item:</strong> {record.itemId.descripcion}</p>
          <p><strong>Cantidad:</strong> {record.cantidad}</p>
          <p><strong>Estado:</strong> {record.estado}</p>
          <p><strong>Motivo de Solicitud:</strong> {record.motivoSolicitud}</p>
          {record.estado === 'RECHAZADA' && (
            <p><strong>Motivo de Rechazo:</strong> {record.motivoRechazo}</p>
          )}
          {record.numerosSerie && record.numerosSerie.length > 0 && (
            <p><strong>Números de Serie:</strong> {record.numerosSerie.join(', ')}</p>
          )}
          {record.fechaAprobacion && (
            <p>
              <strong>Fecha de {record.estado.toLowerCase()}:</strong>{' '}
              {new Date(record.fechaAprobacion).toLocaleDateString('es-MX')}
            </p>
          )}
        </div>
      ),
      width: 600
    });
  };

  const columns = [
    {
      title: 'Fecha',
      dataIndex: 'fechaSolicitud',
      key: 'fechaSolicitud',
      render: (fecha: string) => new Date(fecha).toLocaleDateString('es-MX')
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoMovimiento',
      key: 'tipoMovimiento',
      render: (tipo: string) => (
        <Tag color={tipo === 'ENTRADA' ? 'green' : 'red'}>
          {tipo}
        </Tag>
      )
    },
    {
      title: 'Item',
      dataIndex: ['itemId', 'descripcion'],
      key: 'item'
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad'
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => getStatusTag(estado)
    },
    {
      title: 'Detalles',
      key: 'detalles',
      render: (_: any, record: any) => (
        <a onClick={() => showRequestDetails(record)}>Ver detalles</a>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>Mis Solicitudes</h2>
        <Button
          type="primary"
          onClick={loadRequests}
          loading={loading}
          icon={<ReloadOutlined />}
        >
          Actualizar
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={requests}
        rowKey="_id"
        pagination={pagination}
        onChange={handleTableChange}
        loading={loading}
      />
    </div>
  );
};

export default InventoryRequestsTable;