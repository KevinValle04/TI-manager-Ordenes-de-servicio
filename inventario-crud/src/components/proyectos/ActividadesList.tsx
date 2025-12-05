import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { Colaborador, Proyecto } from '../../types';
import ActividadesKanban from './ActividadesKanban';
import ActividadesMobile from './ActividadesMobile';

interface ActividadesListProps {
  show: boolean;
  onHide: () => void;
  proyecto: Proyecto | null;
  colaboradores: Colaborador[];
}

const ActividadesList: React.FC<ActividadesListProps> = ({
  show,
  onHide,
  proyecto,
  colaboradores
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Si es móvil, mostrar solo la vista móvil optimizada
  if (isMobile) {
    return (
      <ActividadesMobile
        show={show}
        onHide={onHide}
        proyecto={proyecto}
        colaboradores={colaboradores}
      />
    );
  }

  // Render Kanban para desktop
  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="xxl-down" dialogClassName="modal-90w">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-tasks me-2"></i>
          Actividades del Proyecto: {proyecto?.nombre}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        <ActividadesKanban
          show={show}
          onHide={onHide}
          proyecto={proyecto}
          colaboradores={colaboradores}
        />
      </Modal.Body>
    </Modal>
  );
};

export default ActividadesList;
