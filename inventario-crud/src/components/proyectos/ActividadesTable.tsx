import React, { useEffect, useState } from 'react';
import { Badge, Button, Table } from 'react-bootstrap';
import { Actividad, Colaborador, Proyecto } from '../../types';
import ActividadModal from './ActividadModal';
import ActividadViewModal from './ActividadViewModal';
import { exportGanttToPDF } from '../../utils/ganttExport';

interface ActividadesTableProps {
  show: boolean;
  onHide: () => void;
  proyecto: Proyecto | null;
  colaboradores: Colaborador[];
}

const ActividadesTable: React.FC<ActividadesTableProps> = ({
  show,
  proyecto,
  colaboradores
}) => {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [loading, setLoading] = useState(false);
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

  const handleViewActividad = (actividad: Actividad) => {
    setViewingActividad(actividad);
    setShowViewModal(true);
  };

  const handleEditFromView = () => {
    if (viewingActividad) {
      setEditingActividad(viewingActividad);
      setShowViewModal(false);
      setShowActividadModal(true);
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
      return <span className="text-muted">Sin empleados</span>;
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

  const handleExportGantt = () => {
    if (!proyecto) return;
    exportGanttToPDF({ actividades, proyecto });
  };

  return (
    <>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button
          variant="success"
          onClick={handleExportGantt}
          disabled={actividades.length === 0}
        >
          <i className="fas fa-file-pdf me-2"></i>
          Exportar Gantt
        </Button>
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
                <th>Empleados</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actividades.map(actividad => (
                <tr 
                  key={actividad._id}
                  onClick={() => handleViewActividad(actividad)}
                  style={{ cursor: 'pointer' }}
                >
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
                  <td onClick={(e) => e.stopPropagation()}>
                    <div className="d-flex gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewActividad(actividad)}
                        title="Ver actividad"
                      >
                        <i className="fas fa-eye"></i>
                      </Button>
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

      <ActividadModal
        show={showActividadModal}
        onHide={() => {
          setShowActividadModal(false);
          setEditingActividad(null);
        }}
        onSave={handleSaveActividad}
        editingActividad={editingActividad}
        colaboradores={colaboradores}
        actividades={actividades}
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
        onDelete={() => viewingActividad?._id && handleDeleteActividad(viewingActividad._id)}
        onUpdateEvidencias={handleUpdateEvidencias}
        onUpdateNotas={handleUpdateNotas}
      />
    </>
  );
};

export default ActividadesTable;
