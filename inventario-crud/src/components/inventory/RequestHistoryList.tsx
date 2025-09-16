import React, { useState, useEffect } from 'react';
import { Table, message, Tag, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import type { TableProps } from 'antd';

interface InventoryRequest {
  _id: string;
  tipoMovimiento: 'ENTRADA' | 'SALIDA';
  inventarioTipo: 'INTERIOR' | 'EXTERIOR';
  itemId: {
    descripcion: string;
    marca: string;
    modelo: string;
  };
  cantidad: number;
  solicitanteId: {
    username: string;
  };
  estado: 'APROBADA' | 'RECHAZADA';
  fechaSolicitud: string;
  fechaAprobacion: string;
  motivoSolicitud: string;
  motivoRechazo?: string;
  aprobadorId?: {
    username: string;
  };
}

const RequestHistoryList: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<InventoryRequest[]>([]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        message.error('No tiene autorización para ver el historial');
        return;
      }

      const response = await axios.get<InventoryRequest[]>(
        `${import.meta.env.VITE_API_URL}inventory-requests/history`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setRequests(response.data);
    } catch (error: any) {
      message.error('Error al obtener el historial de solicitudes');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const columns: TableProps<InventoryRequest>['columns'] = [
    {
      title: 'Fecha Solicitud',
      dataIndex: 'fechaSolicitud',
      key: 'fechaSolicitud',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Tipo',
      dataIndex: 'tipoMovimiento',
      key: 'tipoMovimiento',
      render: (tipo: string) => (
        <Tag color={tipo === 'ENTRADA' ? 'green' : 'red'}>
          {tipo}
        </Tag>
      ),
    },
    {
      title: 'Inventario',
      dataIndex: 'inventarioTipo',
      key: 'inventarioTipo',
    },
    {
      title: 'Artículo',
      dataIndex: 'itemId',
      key: 'itemId',
      render: (item: any) => `${item.descripcion} - ${item.marca} ${item.modelo}`,
    },
    {
      title: 'Cantidad',
      dataIndex: 'cantidad',
      key: 'cantidad',
    },
    {
      title: 'Solicitante',
      dataIndex: ['solicitanteId', 'username'],
      key: 'solicitante',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: string) => (
        <Tag color={estado === 'APROBADA' ? 'green' : 'red'}>
          {estado}
        </Tag>
      ),
    },
    {
      title: 'Fecha Respuesta',
      dataIndex: 'fechaAprobacion',
      key: 'fechaAprobacion',
      render: (date: string) => date ? new Date(date).toLocaleString() : '-',
    },
    {
      title: 'Motivo Solicitud',
      dataIndex: 'motivoSolicitud',
      key: 'motivoSolicitud',
    },
    {
      title: 'Motivo Rechazo',
      dataIndex: 'motivoRechazo',
      key: 'motivoRechazo',
      render: (motivo: string) => motivo || '-',
    },
    {
      title: 'Aprobador',
      dataIndex: ['aprobadorId', 'username'],
      key: 'aprobador',
      render: (username: string) => username || '-',
    },
  ];

  return (
    <div>
      <div className="mb-3 d-flex justify-content-end">
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={fetchRequests}
          loading={loading}
        >
          Actualizar
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={requests}
        rowKey="_id"
        loading={loading}
        scroll={{ x: true }}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`
        }}
      />
    </div>
  );
};

export default RequestHistoryList;