import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Proyecto, Colaborador } from '../../types';
import DataTable from '../common/DataTable';
import PaginationCompact from '../common/PaginationCompact';
import SearchBar from '../common/SearchBar';
import ProyectoModal from './ProyectoModal';

const ProyectoList: React.FC = () => {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [filteredProyectos, setFilteredProyectos] = useState<Proyecto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProyectos();
    fetchColaboradores();
  }, []);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, proyectos]);

  const fetchProyectos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/proyectos');
      if (!response.ok) throw new Error('Error al cargar proyectos');
      const data = await response.json();
      setProyectos(data);
      setFilteredProyectos(data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      setError('Error al cargar los proyectos');
      setProyectos([]);
      setFilteredProyectos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchColaboradores = async () => {
    try {
      const response = await fetch('/api/colaboradores');
      if (!response.ok) throw new Error('Error al cargar colaboradores');
      const data = await response.json();
      setColaboradores(data);
    } catch (error) {
      console.error('Error al cargar colaboradores:', error);
      setColaboradores([]);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredProyectos(proyectos);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = proyectos.filter(proyecto => 
      proyecto.nombre.toLowerCase().includes(lowerTerm) ||
      proyecto.estado?.toLowerCase().includes(lowerTerm) ||
      proyecto.descripcion?.toLowerCase().includes(lowerTerm)
    );
    
    setFilteredProyectos(filtered);
    setCurrentPage(1);
  };

  const handleEdit = (proyecto: Proyecto) => {
    setEditingProyecto(proyecto);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este proyecto?')) return;
    
    try {
      const response = await fetch(`/api/proyectos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('Error al eliminar el proyecto');
        return;
      }

      fetchProyectos();
    } catch (error) {
      alert('Error al eliminar el proyecto');
      console.error('Error:', error);
    }
  };

  const handleSave = async (data: Partial<Proyecto>) => {
    try {
      const url = data._id 
        ? `/api/proyectos/${data._id}`
        : '/api/proyectos';
      
      const response = await fetch(url, {
        method: data._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar el proyecto');
      }

      fetchProyectos();
      setShowModal(false);
      setEditingProyecto(null);
    } catch (error: any) {
      console.error('Error al guardar:', error);
      alert(error.message || 'Error al guardar el proyecto');
    }
  };

  const getEstadoBadgeClass = (estado?: string) => {
    switch (estado) {
      case 'En progreso': return 'primary';
      case 'Completado': return 'success';
      case 'Pausado': return 'warning';
      case 'Cancelado': return 'danger';
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

  const getColaboradoresNames = (proyecto: Proyecto) => {
    if (!proyecto.colaboradores || proyecto.colaboradores.length === 0) {
      return <span className="text-muted">Sin colaboradores</span>;
    }

    const colaboradoresList = proyecto.colaboradores.map(c => {
      if (typeof c === 'string') {
        const colab = colaboradores.find(col => col._id === c);
        return colab ? colab.nombre : 'N/A';
      }
      return c.nombre;
    });

    return (
      <div>
        {colaboradoresList.slice(0, 2).map((nombre, idx) => (
          <div key={idx} className="text-truncate" style={{ maxWidth: '200px' }}>
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

  const columns = [
    { 
      key: 'nombre', 
      label: 'Nombre del Proyecto',
      render: (proyecto: Proyecto) => (
        <div>
          <strong>{proyecto.nombre}</strong>
          {proyecto.descripcion && (
            <div className="small text-muted text-truncate" style={{ maxWidth: '300px' }}>
              {proyecto.descripcion}
            </div>
          )}
        </div>
      )
    },
    { 
      key: 'fechaInicio', 
      label: 'Fecha Inicio',
      render: (proyecto: Proyecto) => formatDate(proyecto.fechaInicio)
    },
    { 
      key: 'fechaTerminacion', 
      label: 'Fecha Terminación',
      render: (proyecto: Proyecto) => formatDate(proyecto.fechaTerminacion)
    },
    { 
      key: 'colaboradores', 
      label: 'Colaboradores',
      render: (proyecto: Proyecto) => getColaboradoresNames(proyecto)
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (proyecto: Proyecto) => (
        <span className={`badge bg-${getEstadoBadgeClass(proyecto.estado)}`}>
          {proyecto.estado || 'En progreso'}
        </span>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (proyecto: Proyecto) => (
        <>
          <Button
            variant="warning"
            size="sm"
            className="me-2"
            onClick={() => handleEdit(proyecto)}
          >
            <i className="fas fa-edit"></i> Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(proyecto._id!)}
          >
            <i className="fas fa-trash"></i> Eliminar
          </Button>
        </>
      )
    }
  ];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProyectos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProyectos.length / itemsPerPage);

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>
          <i className="fas fa-project-diagram me-2"></i>
          Proyectos
        </h2>
        <Button 
          variant="primary" 
          onClick={() => {
            setEditingProyecto(null);
            setShowModal(true);
          }}
        >
          <i className="fas fa-plus me-2"></i>
          Nuevo Proyecto
        </Button>
      </div>

      <SearchBar
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Buscar por nombre, estado o descripción..."
      />

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      ) : filteredProyectos.length === 0 ? (
        <div className="alert alert-info" role="alert">
          <i className="fas fa-info-circle me-2"></i>
          {searchTerm ? 'No se encontraron proyectos con ese criterio de búsqueda' : 'No hay proyectos registrados. ¡Crea el primero!'}
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <DataTable
              columns={columns}
              data={currentItems}
            />
          </div>
          <PaginationCompact
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <ProyectoModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setEditingProyecto(null);
        }}
        onSave={handleSave}
        editingProyecto={editingProyecto}
        colaboradores={colaboradores}
      />
    </div>
  );
};

export default ProyectoList;
