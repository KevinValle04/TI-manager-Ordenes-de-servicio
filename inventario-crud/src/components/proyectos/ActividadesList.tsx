import React, { useState, useEffect } from 'react';
import { Modal, Button, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { Colaborador, Proyecto } from '../../types';
import ActividadesKanban from './ActividadesKanban';
import ActividadesTable from './ActividadesTable';
import ActividadesMobile from './ActividadesMobile';

interface ActividadesListProps {
  show: boolean;
  onHide: () => void;
  proyecto: Proyecto | null;
  colaboradores: Colaborador[];
}

type ViewMode = 'kanban' | 'table';

const ActividadesList: React.FC<ActividadesListProps> = ({
  show,
  onHide,
  proyecto,
  colaboradores
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
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

  // Render Kanban in its own modal for desktop
  if (viewMode === 'kanban') {
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
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </Modal.Body>
      </Modal>
    );
  }

  // Render table view in a modal for desktop
  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-tasks me-2"></i>
          Actividades del Proyecto: {proyecto?.nombre}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <ButtonGroup>
            <ToggleButton
              id="view-kanban"
              type="radio"
              variant="outline-primary"
              name="view"
              value="kanban"
              checked={false}
              onChange={(e) => setViewMode(e.currentTarget.value as ViewMode)}
            >
              <i className="fas fa-columns me-2"></i>
              Kanban
            </ToggleButton>
            <ToggleButton
              id="view-table"
              type="radio"
              variant="primary"
              name="view"
              value="table"
              checked={true}
              onChange={(e) => setViewMode(e.currentTarget.value as ViewMode)}
            >
              <i className="fas fa-table me-2"></i>
              Tabla
            </ToggleButton>
          </ButtonGroup>
        </div>

        <ActividadesTable
          show={show}
          onHide={onHide}
          proyecto={proyecto}
          colaboradores={colaboradores}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ActividadesList;
