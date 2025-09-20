import React from 'react';
import { useNavigate } from 'react-router-dom';
import ColaboradorList from '../components/colaboradores/ColaboradorList';

const Colaboradores: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Colaboradores</h2>
      </div>
      <ColaboradorList />
    </div>
  );
};

export default Colaboradores;
