import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge } from 'react-bootstrap';
import { Actividad, Colaborador, Proyecto } from '../../types';
import ActividadModal from './ActividadModal';

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
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
  const [showActividadModal, setShowActividadModal] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);

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
      case 'Pendiente': return 'secondary';
      case 'En progreso': return 'primary';
      case 'Completada': return 'success';
      case 'Cancelada': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getColaboradoresNames = (actividad: Actividad) => {
    if (!actividad.colaboradores || actividad.colaboradores.length === 0) {
      return <span className="text-muted">Sin colaboradores</span>;
    }

    const colaboradoresList = actividad.colaboradores.map(c => {
      if (typeof c === 'string') {
        const colab = colaboradores.find(col => col._id === c);
        return colab ? colab.nombre : 'N/A';
      }
      return c.nombre;
    });

    return (
      <div>
        {colaboradoresList.slice(0, 2).map((nombre, idx) => (
          <div key={idx} className="small">
            <i className="fas fa-user me-1"></i>{nombre}
          </div>
        ))}
        {colaboradoresList.length > 2 && (
          <small className="text-muted">
            +{colaboradoresList.length - 2} más
          </small>
        )}
      </div>
    );
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-tasks me-2"></i>
            Actividades del Proyecto: {proyecto?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-end mb-3">
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
          ) : actividades.length === 0 ? (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No hay actividades registradas para este proyecto. ¡Crea la primera!
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped bordered hover>
                <thead className="table-dark">
                  <tr>
                    <th>Descripción</th>
                    <th>Fecha Inicio</th>
                    <th>Fecha Final</th>
                    <th>Estado</th>
                    <th>Colaboradores</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {actividades.map(actividad => (
                    <tr key={actividad._id}>
                      <td style={{ maxWidth: '300px' }}>
                        {actividad.descripcion}
                      </td>
                      <td>{formatDate(actividad.fechaInicio)}</td>
                      <td>{formatDate(actividad.fechaFinal)}</td>
                      <td>
                        <Badge bg={getEstadoBadgeClass(actividad.estado)}>
                          {actividad.estado}
                        </Badge>
                      </td>
                      <td>{getColaboradoresNames(actividad)}</td>
                      <td>
                        <div className="d-flex gap-1">
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleEditActividad(actividad)}
                            title="Editar actividad"
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteActividad(actividad._id!)}
                            title="Eliminar actividad"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

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

export default ActividadesList;
