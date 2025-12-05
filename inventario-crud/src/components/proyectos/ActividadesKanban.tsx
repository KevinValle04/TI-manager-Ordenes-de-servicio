import React, { useState, useEffect } from 'react';
import { Button, Badge, ButtonGroup, ToggleButton } from 'react-bootstrap';
import { ControlledBoard, Card, KanbanBoard, moveCard } from '@caldwell619/react-kanban';
import '@caldwell619/react-kanban/dist/styles.css';
import { Actividad, Colaborador, Proyecto } from '../../types';
import ActividadModal from './ActividadModal';
import ActividadViewModal from './ActividadViewModal';
import './ActividadesKanban.css';

interface ActividadesKanbanProps {
  show: boolean;
  onHide: () => void;
  proyecto: Proyecto | null;
  colaboradores: Colaborador[];
  viewMode: 'kanban' | 'table';
  setViewMode: (mode: 'kanban' | 'table') => void;
}

interface KanbanCard extends Card {
  id: string;
  title: string;
  description: string;
  fechaInicio: string;
  fechaFinal: string;
  colaboradores: string[] | Colaborador[];
  actividadData: Actividad;
  color?: string; // Color personalizado
}

const ActividadesKanban: React.FC<ActividadesKanbanProps> = ({
  show,
  proyecto,
  colaboradores,
  viewMode,
  setViewMode
}) => {
  const estadosConfig = [
    { id: 'Pendiente', title: 'Pendiente', color: '#6c757d' },
    { id: 'En progreso', title: 'En progreso', color: '#0d6efd' },
    { id: 'Completada', title: 'Completada', color: '#198754' },
    { id: 'Cancelada', title: 'Cancelada', color: '#dc3545' }
  ];

  // Inicializar board con columnas vacías
  const initialBoard: KanbanBoard<KanbanCard> = {
    columns: estadosConfig.map(estado => ({
      id: estado.id,
      title: estado.title,
      cards: []
    }))
  };

  const [board, setBoard] = useState<KanbanBoard<KanbanCard>>(initialBoard);
  const [loading, setLoading] = useState(true); // Comenzar en true para la primera carga
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [viewingActividad, setViewingActividad] = useState<Actividad | null>(null);

  useEffect(() => {
    if (show && proyecto) {
      fetchActividades();
    }
  }, [show, proyecto]);

  const fetchActividades = async () => {
    if (!proyecto?._id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/proyectos/${proyecto._id}/actividades`);
      if (!response.ok) throw new Error('Error al cargar actividades');
      const data: Actividad[] = await response.json();
      
      // Organizar actividades en columnas del Kanban
      const columns = estadosConfig.map(estado => ({
        id: estado.id,
        title: estado.title,
        cards: data
          .filter(act => act.estado === estado.id)
          .map(act => ({
            id: act._id!,
            title: act.descripcion,
            description: `${formatDate(act.fechaInicio)} - ${formatDate(act.fechaFinal)}`,
            fechaInicio: formatDate(act.fechaInicio),
            fechaFinal: formatDate(act.fechaFinal),
            colaboradores: act.colaboradores,
            actividadData: act,
            color: act.color || '#0d6efd'
          }))
      }));

      setBoard({ columns });
    } catch (error) {
      console.error('Error al cargar actividades:', error);
      alert('Error al cargar las actividades del proyecto');
      // En caso de error, mantener las columnas vacías
      setBoard({
        columns: estadosConfig.map(estado => ({
          id: estado.id,
          title: estado.title,
          cards: []
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCardMove = async (
    _card: KanbanCard, 
    source?: { fromPosition: number; fromColumnId?: string | number },
    destination?: { toPosition?: number; toColumnId?: string | number }
  ) => {
    if (!destination?.toColumnId || !source) return;

    // Primero actualizar el board localmente para feedback inmediato
    const updatedBoard = moveCard(board, source, destination);
    setBoard(updatedBoard);

    // Luego actualizar en el servidor
    try {
      const actividad = _card.actividadData;
      const response = await fetch(`/api/actividades/${actividad._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...actividad,
          estado: destination.toColumnId as Actividad['estado']
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el estado');
        // Si falla, recargar desde el servidor
        fetchActividades();
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar el estado de la actividad');
      // Recargar desde el servidor para revertir
      fetchActividades();
    }
  };

  const handleSaveActividad = async (data: Partial<Actividad>) => {
    try {
      const url = data._id
        ? `/api/actividades/${data._id}`
        : `/api/proyectos/${proyecto?._id}/actividades`;
      
      const response = await fetch(url, {
        method: data._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la actividad');
      }

      fetchActividades();
      setShowActividadModal(false);
      setEditingActividad(null);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(error.message || 'Error al guardar la actividad');
    }
  };

  const handleViewCard = (card: KanbanCard) => {
    setViewingActividad(card.actividadData);
    setShowViewModal(true);
  };

  const handleEditFromView = () => {
    if (viewingActividad) {
      setEditingActividad(viewingActividad);
      setShowViewModal(false);
      setShowActividadModal(true);
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta actividad?')) return;
    
    try {
      const response = await fetch(`/api/actividades/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('Error al eliminar la actividad');
        return;
      }

      setShowViewModal(false);
      setViewingActividad(null);
      fetchActividades();
    } catch (error) {
      alert('Error al eliminar la actividad');
      console.error('Error:', error);
    }
  };

  const handleUpdateEvidencias = (evidencias: any[]) => {
    if (viewingActividad) {
      setViewingActividad({ ...viewingActividad, evidencias });
    }
  };

  const handleUpdateNotas = (notas: any[]) => {
    if (viewingActividad) {
      setViewingActividad({ ...viewingActividad, notas });
    }
  };

  const getColaboradoresNames = (colaboradoresData: string[] | Colaborador[]) => {
    if (!colaboradoresData || colaboradoresData.length === 0) {
      return [];
    }

    return colaboradoresData.map(c => {
      if (typeof c === 'string') {
        const colab = colaboradores.find(col => col._id === c);
        return colab ? colab.nombre : 'N/A';
      }
      return c.nombre;
    });
  };

  const renderCard = (card: KanbanCard) => {
    const colaboradoresNames = getColaboradoresNames(card.colaboradores);
    
    return (
      <div 
        className="kanban-card" 
        onClick={() => handleViewCard(card)}
        style={{ 
          cursor: 'pointer',
          borderLeft: `4px solid ${card.color || '#0d6efd'}`
        }}
      >
        <div className="kanban-card-header">
          <h6 className="kanban-card-title">{card.title}</h6>
          <div className="kanban-card-actions">
            <button
              className="btn btn-sm btn-link p-0 me-2"
              onClick={(e) => {
                e.stopPropagation();
                handleViewCard(card);
              }}
              title="Ver"
            >
              <i className="fas fa-eye text-primary"></i>
            </button>
            <button
              className="btn btn-sm btn-link p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCard(card.id);
              }}
              title="Eliminar"
            >
              <i className="fas fa-trash text-danger"></i>
            </button>
          </div>
        </div>
        
        <div className="kanban-card-body">
          <div className="kanban-card-dates">
            <small className="text-muted">
              <i className="fas fa-calendar-alt me-1"></i>
              {card.fechaInicio} - {card.fechaFinal}
            </small>
          </div>
          
          {colaboradoresNames.length > 0 && (
            <div className="kanban-card-colaboradores mt-2">
              <div className="d-flex flex-wrap gap-1">
                {colaboradoresNames.slice(0, 3).map((nombre, idx) => (
                  <Badge key={idx} bg="secondary" className="kanban-badge">
                    <i className="fas fa-user me-1"></i>
                    {nombre}
                  </Badge>
                ))}
                {colaboradoresNames.length > 3 && (
                  <Badge bg="info" className="kanban-badge">
                    +{colaboradoresNames.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="kanban-modal-body">
        <div className="d-flex justify-content-between align-items-center mb-3 px-3">
          <ButtonGroup>
            <ToggleButton
              id="view-kanban-inner"
              type="radio"
              variant="primary"
              name="view"
              value="kanban"
              checked={viewMode === 'kanban'}
              onChange={(e) => setViewMode(e.currentTarget.value as 'kanban' | 'table')}
            >
              <i className="fas fa-columns me-2"></i>
              Kanban
            </ToggleButton>
            <ToggleButton
              id="view-table-inner"
              type="radio"
              variant="outline-primary"
              name="view"
              value="table"
              checked={viewMode === 'table'}
              onChange={(e) => setViewMode(e.currentTarget.value as 'kanban' | 'table')}
            >
              <i className="fas fa-table me-2"></i>
              Tabla
            </ToggleButton>
          </ButtonGroup>
          
          <Button
            variant="primary"
            onClick={() => {
              setEditingActividad(null);
              setShowActividadModal(true);
            }}
          >
            <i className="fas fa-plus me-2"></i>
            Nueva Actividad
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Cargando...</span>
            </div>
          </div>
        ) : (
          <div className="kanban-board-container">
            <ControlledBoard
              onCardDragEnd={handleCardMove}
              renderCard={renderCard}
              disableColumnDrag
              allowAddCard={false}
              allowRemoveCard={false}
              allowAddColumn={false}
              allowRemoveColumn={false}
              allowRenameColumn={false}
            >
              {board}
            </ControlledBoard>
          </div>
        )}
      </div>

      <ActividadModal
        show={showActividadModal}
        onHide={() => {
          setShowActividadModal(false);
          setEditingActividad(null);
        }}
        onSave={handleSaveActividad}
        editingActividad={editingActividad}
        colaboradores={colaboradores}
      />

      <ActividadViewModal
        show={showViewModal}
        onHide={() => {
          setShowViewModal(false);
          setViewingActividad(null);
        }}
        actividad={viewingActividad}
        colaboradores={colaboradores}
        onEdit={handleEditFromView}
        onDelete={() => viewingActividad?._id && handleDeleteCard(viewingActividad._id)}
        onUpdateEvidencias={handleUpdateEvidencias}
        onUpdateNotas={handleUpdateNotas}
      />
    </>
  );
};

export default ActividadesKanban;
