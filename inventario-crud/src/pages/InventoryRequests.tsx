import React, { useState } from 'react';
import { Tabs } from 'antd';
import PendingRequestsList from '../components/inventory/PendingRequestsList';
import MyRequestsList from '../components/inventory/MyRequestsList';
import RequestHistoryList from '../components/inventory/RequestHistoryList';
import { jwtDecode } from 'jwt-decode';

const InventoryRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState('1');

  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  const token = localStorage.getItem('token');
  const isAdmin = token ? (jwtDecode(token) as any).isAdmin : false;

  const items = isAdmin ? [
    {
      key: '1',
      label: 'Solicitudes Pendientes',
      children: <PendingRequestsList />
    },
    {
      key: '2',
      label: 'Historial de Solicitudes',
      children: <RequestHistoryList />
    }
  ] : [
    {
      key: '1',
      label: 'Mis Solicitudes',
      children: <MyRequestsList />
    }
  ];

  return (
    <div className="container-fluid mt-4">
      <div className="card">
        <div className="card-body">
          <h2 className="card-title mb-4">Gestión de Solicitudes de Inventario</h2>
          
          <Tabs activeKey={activeTab} items={items} onChange={handleTabChange} />
        </div>
      </div>
    </div>
  );
};

export default InventoryRequests;
