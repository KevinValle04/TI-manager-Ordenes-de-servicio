import React, { useState } from 'react';
import { Modal, Button, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { Colaborador, Proyecto } from '../../types';
import ActividadesKanban from './ActividadesKanban';
import ActividadesTable from './ActividadesTable';

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

  // Render Kanban in its own modal
  if (viewMode === 'kanban') {
    return (
      <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-tasks me-2"></i>
            Actividades del Proyecto: {proyecto?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="d-flex justify-content-end p-3 pb-0">
            <ButtonGroup>
              <ToggleButton
                id="view-kanban"
                type="radio"
                variant="primary"
                name="view"
                value="kanban"
                checked={true}
                onChange={(e) => setViewMode(e.currentTarget.value as ViewMode)}
              >
                <i className="fas fa-columns me-2"></i>
                Kanban
              </ToggleButton>
              <ToggleButton
                id="view-table"
                type="radio"
                variant="outline-primary"
                name="view"
                value="table"
                checked={false}
                onChange={(e) => setViewMode(e.currentTarget.value as ViewMode)}
              >
                <i className="fas fa-table me-2"></i>
                Tabla
              </ToggleButton>
            </ButtonGroup>
          </div>

          <ActividadesKanban
            show={show}
            onHide={onHide}
            proyecto={proyecto}
            colaboradores={colaboradores}
          />
        </Modal.Body>
      </Modal>
    );
  }

  // Render table view in a modal
  return (
    <Modal show={show} onHide={onHide} size="xl" fullscreen="lg-down">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-tasks me-2"></i>
          Actividades del Proyecto: {proyecto?.nombre}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-flex justify-content-end mb-3">
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
