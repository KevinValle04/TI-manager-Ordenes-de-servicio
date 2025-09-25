import { useState } from 'react';
import { Tabs } from 'antd';
import InventoryRequestsTable from './InventoryRequestsTable';
import MyToolRequestsList from './MyToolRequestsList';


const MyRequestsList = () => {
  const [activeTab, setActiveTab] = useState('1');
  const items = [
    {
      key: '1',
      label: 'Inventario',
      children: <InventoryRequestsTable />
    },
    {
      key: '2',
      label: 'Herramientas',
      children: <MyToolRequestsList />
    }
  ];
  return (
    <Tabs activeKey={activeTab} items={items} onChange={setActiveTab} />
  );
};

export default MyRequestsList;
