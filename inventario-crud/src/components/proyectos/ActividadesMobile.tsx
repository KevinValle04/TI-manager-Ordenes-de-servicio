import React, { useEffect, useState } from 'react';
import { Badge, Button, Modal, Accordion } from 'react-bootstrap';
import { Actividad, Colaborador, Proyecto } from '../../types';
import ActividadModal from './ActividadModal';
import './ActividadesMobile.css';

interface ActividadesMobileProps {
  show: boolean;
  onHide: () => void;
  proyecto: Proyecto | null;
  colaboradores: Colaborador[];
}

const ActividadesMobile: React.FC<ActividadesMobileProps> = ({
  show,
  onHide,
  proyecto,
  colaboradores
}) => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('Todas');

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
      const data = await response.json();
      setActividades(data);
    } catch (error) {
      console.error('Error al cargar actividades:', error);
      alert('Error al cargar las actividades del proyecto');
    } finally {
      setLoading(false);
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

  const handleEditActividad = (actividad: Actividad) => {
    setEditingActividad(actividad);
    setShowActividadModal(true);
  };

  const handleDeleteActividad = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta actividad?')) return;
    
    try {
      const response = await fetch(`/api/actividades/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('Error al eliminar la actividad');
        return;
      }

      fetchActividades();
    } catch (error) {
      alert('Error al eliminar la actividad');
      console.error('Error:', error);
    }
  };

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'Completada': return 'success';
      case 'En progreso': return 'primary';
      case 'Pendiente': return 'warning';
      case 'Cancelada': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getColaboradorNombres = (actividad: Actividad) => {
    if (!actividad.colaboradores || actividad.colaboradores.length === 0) {
      return 'Sin asignar';
    }

    return actividad.colaboradores.map(c => {
      if (typeof c === 'string') {
        const colab = colaboradores.find(col => col._id === c);
        return colab ? colab.nombre : 'N/A';
      }
      return c.nombre;
    }).join(', ');
  };

  const actividadesFiltradas = filterEstado === 'Todas' 
    ? actividades 
    : actividades.filter(a => a.estado === filterEstado);

  const contarPorEstado = (estado: string) => {
    return actividades.filter(a => a.estado === estado).length;
  };

  return (
    <>
      <Modal show={show} onHide={onHide} fullscreen>
        <Modal.Header closeButton className="actividades-mobile-header">
          <Modal.Title>
            <div className="actividades-mobile-title">
              <i className="fas fa-tasks me-2"></i>
              <div>
                <div className="title-text">{proyecto?.nombre}</div>
                <small className="title-subtitle">Actividades del proyecto</small>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="actividades-mobile-body">
          {/* Botón Nueva Actividad */}
          <div className="actividades-mobile-actions">
            <Button 
              variant="primary" 
              className="btn-nueva-actividad"
              onClick={() => {
                setEditingActividad(null);
                setShowActividadModal(true);
              }}
            >
              <i className="fas fa-plus me-2"></i>
              Nueva Actividad
            </Button>
          </div>

          {/* Filtros por Estado */}
          <div className="actividades-mobile-filters">
            <button 
              className={`filter-chip ${filterEstado === 'Todas' ? 'active' : ''}`}
              onClick={() => setFilterEstado('Todas')}
            >
              Todas <span className="filter-count">{actividades.length}</span>
            </button>
            <button 
              className={`filter-chip ${filterEstado === 'Pendiente' ? 'active' : ''}`}
              onClick={() => setFilterEstado('Pendiente')}
            >
              <i className="fas fa-clock me-1"></i>
              Pendiente <span className="filter-count">{contarPorEstado('Pendiente')}</span>
            </button>
            <button 
              className={`filter-chip ${filterEstado === 'En progreso' ? 'active' : ''}`}
              onClick={() => setFilterEstado('En progreso')}
            >
              <i className="fas fa-spinner me-1"></i>
              En Progreso <span className="filter-count">{contarPorEstado('En progreso')}</span>
            </button>
            <button 
              className={`filter-chip ${filterEstado === 'Completada' ? 'active' : ''}`}
              onClick={() => setFilterEstado('Completada')}
            >
              <i className="fas fa-check me-1"></i>
              Completadas <span className="filter-count">{contarPorEstado('Completada')}</span>
            </button>
          </div>

          {/* Lista de Actividades */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : actividadesFiltradas.length === 0 ? (
            <div className="actividades-mobile-empty">
              <i className="fas fa-inbox fa-3x mb-3"></i>
              <h5>No hay actividades</h5>
              <p className="text-muted">
                {filterEstado === 'Todas' 
                  ? 'Aún no hay actividades en este proyecto'
                  : `No hay actividades en estado "${filterEstado}"`
                }
              </p>
            </div>
          ) : (
            <div className="actividades-mobile-list">
              {actividadesFiltradas.map((actividad) => (
                <div 
                  key={actividad._id} 
                  className="actividad-card-mobile"
                  style={{ borderLeftColor: actividad.color || '#6c757d' }}
                >
                  <div className="actividad-card-header">
                    <div className="actividad-card-info">
                      <Badge bg={getEstadoBadgeClass(actividad.estado)} className="actividad-badge">
                        {actividad.estado}
                      </Badge>
                      <span className="actividad-dates">
                        <i className="fas fa-calendar me-1"></i>
                        {formatDate(actividad.fechaInicio)} - {formatDate(actividad.fechaFinal)}
                      </span>
                    </div>
                    <div className="actividad-card-actions">
                      <button 
                        className="btn-icon btn-edit"
                        onClick={() => handleEditActividad(actividad)}
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        className="btn-icon btn-delete"
                        onClick={() => handleDeleteActividad(actividad._id!)}
                        title="Eliminar"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <div className="actividad-card-body">
                    <p className="actividad-descripcion">{actividad.descripcion}</p>
                    
                    {actividad.colaboradores && actividad.colaboradores.length > 0 && (
                      <div className="actividad-colaboradores">
                        <i className="fas fa-users me-2"></i>
                        <span>{getColaboradorNombres(actividad)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>

        <Modal.Footer className="actividades-mobile-footer">
          <Button variant="secondary" onClick={onHide} className="w-100">
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Actividad */}
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
    </>
  );
};

export default ActividadesMobile;
