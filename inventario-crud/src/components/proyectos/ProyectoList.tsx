import React, { useEffect, useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { Cliente, Colaborador, Cotizacion, Entrega, IInventoryItem, OrdenCompra, Proyecto, RazonSocial, Vendedor } from '../../types';
import DataTable from '../common/DataTable';
import PaginationCompact from '../common/PaginationCompact';
import SearchBar from '../common/SearchBar';
import CotizacionModal from '../cotizaciones/CotizacionModal';
import EntregaModal from '../entregas/EntregaModal';
import OrdenCompraForm from '../ordenesCompra/OrdenCompraForm';
import ActividadesList from './ActividadesList';
import ProyectoModal from './ProyectoModal';
import DireccionesModal from './DireccionesModal';
import '../../styles/Proyectos.css';


const ProyectoList: React.FC = () => {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [filteredProyectos, setFilteredProyectos] = useState<Proyecto[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);

  
  
  // Estados para los modales de cotizaciones y órdenes de compra
  const [showCotizacionesModal, setShowCotizacionesModal] = useState(false);
  const [showEntregasModal, setShowEntregasModal] = useState(false);
  const [showOrdenesModal, setShowOrdenesModal] = useState(false);
  const [showActividadesModal, setShowActividadesModal] = useState(false);
  const [showDireccionesModal, setShowDireccionesModal] = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [cotizacionesProyecto, setCotizacionesProyecto] = useState<Cotizacion[]>([]);
  const [entregasProyecto, setEntregasProyecto] = useState<Entrega[]>([]);
  const [ordenesProyecto, setOrdenesProyecto] = useState<OrdenCompra[]>([]);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(false);
  const [loadingEntregas, setLoadingEntregas] = useState(false);
  const [loadingOrdenes, setLoadingOrdenes] = useState(false);
  
  // Estados para editar cotizaciones y órdenes
  const [showEditCotizacionModal, setShowEditCotizacionModal] = useState(false);
  const [showEditEntregaModal, setShowEditEntregaModal] = useState(false);
  const [showEditOrdenModal, setShowEditOrdenModal] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);
  const [editingOrdenId, setEditingOrdenId] = useState<string | null>(null);
  
  // Datos auxiliares para edición
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [inventarioItems, setInventarioItems] = useState<IInventoryItem[]>([]);
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProyectoId, setExpandedProyectoId] = useState<string | null>(null);
  

  useEffect(() => {
    fetchProyectos();
    fetchColaboradores();
    fetchClientes();
    fetchInventarioItems();
    fetchRazonesSociales();
    fetchVendedores();
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

  const fetchClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      if (!response.ok) throw new Error('Error al cargar clientes');
      const data = await response.json();
      setClientes(data);
    } catch (error) {
      console.error('Error al cargar clientes:', error);
      setClientes([]);
    }
  };

  const fetchInventarioItems = async () => {
    try {
      const response = await fetch('/api/inventario');
      if (!response.ok) throw new Error('Error al cargar inventario');
      const data = await response.json();
      setInventarioItems(data);
    } catch (error) {
      console.error('Error al cargar inventario:', error);
      setInventarioItems([]);
    }
  };

  const fetchRazonesSociales = async () => {
    try {
      const response = await fetch('/api/razones-sociales');
      if (!response.ok) throw new Error('Error al cargar razones sociales');
      const data = await response.json();
      setRazonesSociales(data);
    } catch (error) {
      console.error('Error al cargar razones sociales:', error);
      setRazonesSociales([]);
    }
  };

  const fetchVendedores = async () => {
    try {
      const response = await fetch('/api/vendedores');
      if (!response.ok) throw new Error('Error al cargar vendedores');
      const data = await response.json();
      setVendedores(data);
    } catch (error) {
      console.error('Error al cargar vendedores:', error);
      setVendedores([]);
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

  // Funciones para manejar cotizaciones y órdenes de compra
  const handleViewCotizaciones = async (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setLoadingCotizaciones(true);
    setShowCotizacionesModal(true);
    
    try {
      const response = await fetch(`/api/proyectos/${proyecto._id}/cotizaciones`);
      if (!response.ok) throw new Error('Error al cargar cotizaciones');
      const data = await response.json();
      setCotizacionesProyecto(data);
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
      alert('Error al cargar las cotizaciones del proyecto');
    } finally {
      setLoadingCotizaciones(false);
    }
  };

  const handleViewOrdenes = async (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setLoadingOrdenes(true);
    setShowOrdenesModal(true);
    
    try {
      const response = await fetch(`/api/proyectos/${proyecto._id}/ordenes-compra`);
      if (!response.ok) throw new Error('Error al cargar órdenes de compra');
      const data = await response.json();
      setOrdenesProyecto(data);
    } catch (error) {
      console.error('Error al cargar órdenes de compra:', error);
      alert('Error al cargar las órdenes de compra del proyecto');
    } finally {
      setLoadingOrdenes(false);
    }
  };

  const handleViewEntregas = async (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setLoadingEntregas(true);
    setShowEntregasModal(true);
    
    try {
      const response = await fetch(`/api/proyectos/${proyecto._id}/entregas`);
      if (!response.ok) throw new Error('Error al cargar entregas');
      const data = await response.json();
      setEntregasProyecto(data);
    } catch (error) {
      console.error('Error al cargar entregas:', error);
      alert('Error al cargar las entregas del proyecto');
    } finally {
      setLoadingEntregas(false);
    }
  };

  const handleViewActividades = (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
    setShowActividadesModal(true);
  };

  const handleViewDirecciones = (proyecto: Proyecto) => {
  setSelectedProyecto(proyecto);
  setShowDireccionesModal(true);
};

  const toggleExpandProyecto = (proyectoId: string) => {
    setExpandedProyectoId(expandedProyectoId === proyectoId ? null : proyectoId);
  };

  const handleEditCotizacion = (cotizacion: Cotizacion) => {
    setEditingCotizacion(cotizacion);
    setShowEditCotizacionModal(true);
  };

  const handleEditEntrega = (entrega: Entrega) => {
    setEditingEntrega(entrega);
    setShowEditEntregaModal(true);
  };

  const handleEditOrden = (orden: OrdenCompra) => {
    setEditingOrdenId(orden._id || null);
    setShowEditOrdenModal(true);
  };

  const handleSaveCotizacion = async (data: Partial<Cotizacion>) => {
    try {
      const url = data._id 
        ? `/api/cotizaciones/${data._id}`
        : '/api/cotizaciones';
      
      const response = await fetch(url, {
        method: data._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la cotización');
      }

      // Recargar cotizaciones del proyecto
      if (selectedProyecto) {
        await handleViewCotizaciones(selectedProyecto);
      }
      
      setShowEditCotizacionModal(false);
      setEditingCotizacion(null);
    } catch (error: any) {
      console.error('Error al guardar cotización:', error);
      alert(error.message || 'Error al guardar la cotización');
    }
  };

  const handleSaveEntrega = async (data: Partial<Entrega>) => {
    try {
      const url = data._id 
        ? `/api/entregas/${data._id}`
        : '/api/entregas';
      
      const response = await fetch(url, {
        method: data._id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar la entrega');
      }

      // Recargar entregas del proyecto
      if (selectedProyecto) {
        await handleViewEntregas(selectedProyecto);
      }
      
      setShowEditEntregaModal(false);
      setEditingEntrega(null);
    } catch (error: any) {
      console.error('Error al guardar entrega:', error);
      alert(error.message || 'Error al guardar la entrega');
    }
  };

  const handleSaveOrden = async () => {
    // Recargar órdenes del proyecto
    if (selectedProyecto) {
      await handleViewOrdenes(selectedProyecto);
    }
    setShowEditOrdenModal(false);
    setEditingOrdenId(null);
  };

  const generatePresupuestoNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PRES-${year}${month}-${random}`;
  };

  const generateEntregaNumber = (clienteNombre: string) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const clientePrefix = clienteNombre.substring(0, 3).toUpperCase();
    return `ENT-${clientePrefix}-${year}${month}-${random}`;
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
      return <span className="text-muted">Sin empleados</span>;
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
      label: 'Empleados',
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
  render: (proyecto: Proyecto) => {
    const isExpanded = expandedProyectoId === proyecto._id;
    return (
      <div>
        {!isExpanded ? (
          <Button
            variant="outline-primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpandProyecto(proyecto._id!);
            }}
          >
            <i className="fas fa-chevron-down me-1"></i>
            Ver acciones
          </Button>
        ) : (
          <div className="d-flex flex-column gap-1" style={{ minWidth: '150px' }}>
            <div className="d-flex gap-1">
              <Button
                variant="success"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewActividades(proyecto);
                }}
                title="Ver actividades del proyecto"
                className="flex-fill"
              >
                <i className="fas fa-tasks me-1"></i>
                Actividades
              </Button>
            </div>
            <div className="d-flex gap-1">
              <Button
                variant="info"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewCotizaciones(proyecto);
                }}
                title="Ver cotizaciones del proyecto"
                className="flex-fill"
              >
                <i className="fas fa-file-invoice me-1"></i>
                Cotizaciones
              </Button>
            </div>
            <div className="d-flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewEntregas(proyecto);
                }}
                title="Ver entregas del proyecto"
                className="flex-fill"
              >
                <i className="fas fa-truck me-1"></i>
                Entregas
              </Button>
            </div>
            <div className="d-flex gap-1">
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewOrdenes(proyecto);
                }}
                title="Ver órdenes de compra del proyecto"
                className="flex-fill"
              >
                <i className="fas fa-shopping-cart me-1"></i>
                Órdenes
              </Button>
            </div>
            <div className="d-flex gap-1">
              <Button
                variant="dark"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDirecciones(proyecto);
                }}
                title="Gestionar direcciones IP del proyecto"
                className="flex-fill"
              >
                <i className="fas fa-network-wired me-1"></i>
                Direcciones
              </Button>
            </div>
            <div className="d-flex gap-1">
              <Button
                variant="outline-warning"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(proyecto);
                }}
                title="Editar"
              >
                <i className="fas fa-pencil-alt"></i>
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(proyecto._id!);
                }}
                title="Eliminar"
              >
                <i className="fas fa-trash"></i>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
  ];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProyectos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProyectos.length / itemsPerPage);

  // Componente de card para vista móvil
  const ProyectoCardMobile: React.FC<{ proyecto: Proyecto }> = ({ proyecto }) => (
    <div className="proyecto-card-mobile">
      <div className="proyecto-card-mobile-header">
        <div className="proyecto-card-mobile-title">{proyecto.nombre}</div>
        {proyecto.descripcion && (
          <div className="proyecto-card-mobile-description">{proyecto.descripcion}</div>
        )}
      </div>
      
      <div className="proyecto-card-mobile-body">
        <div className="proyecto-card-mobile-row">
          <span className="proyecto-card-mobile-label">Fecha Inicio:</span>
          <span className="proyecto-card-mobile-value">{formatDate(proyecto.fechaInicio)}</span>
        </div>
        
        <div className="proyecto-card-mobile-row">
          <span className="proyecto-card-mobile-label">Fecha Término:</span>
          <span className="proyecto-card-mobile-value">{formatDate(proyecto.fechaTerminacion)}</span>
        </div>
        
        <div className="proyecto-card-mobile-row">
          <span className="proyecto-card-mobile-label">Estado:</span>
          <span className="proyecto-card-mobile-value">
            <span className={`badge bg-${getEstadoBadgeClass(proyecto.estado)}`}>
              {proyecto.estado || 'En progreso'}
            </span>
          </span>
        </div>
        
        <div className="proyecto-card-mobile-row">
          <span className="proyecto-card-mobile-label">Empleados:</span>
          <div className="proyecto-card-mobile-value">
            {proyecto.colaboradores && proyecto.colaboradores.length > 0 ? (
              <div className="proyecto-card-mobile-colaboradores">
                {proyecto.colaboradores.slice(0, 2).map((c, idx) => {
                  const nombre = typeof c === 'string' 
                    ? colaboradores.find(col => col._id === c)?.nombre || 'N/A'
                    : c.nombre;
                  return (
                    <div key={idx}>
                      <i className="fas fa-user me-1"></i>{nombre}
                    </div>
                  );
                })}
                {proyecto.colaboradores.length > 2 && (
                  <small className="text-muted">+{proyecto.colaboradores.length - 2} más</small>
                )}
              </div>
            ) : (
              <span className="text-muted">Sin empleados</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="proyecto-card-mobile-actions">
        <div className="proyecto-card-mobile-actions-grid">
          <Button
            variant="success"
            size="sm"
            onClick={() => handleViewActividades(proyecto)}
            title="Ver actividades"
          >
            <i className="fas fa-tasks me-1"></i>
            Actividades
          </Button>
          
          <Button
            variant="info"
            size="sm"
            onClick={() => handleViewCotizaciones(proyecto)}
            title="Ver cotizaciones"
          >
            <i className="fas fa-file-invoice me-1"></i>
            Cotizaciones
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleViewEntregas(proyecto)}
            title="Ver entregas"
          >
            <i className="fas fa-truck me-1"></i>
            Entregas
          </Button>
          
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleViewOrdenes(proyecto)}
            title="Ver órdenes"
          >
            <i className="fas fa-shopping-cart me-1"></i>
            Órdenes
          </Button>

          <Button
            variant="dark"
            size="sm"
            onClick={() => handleViewDirecciones(proyecto)}
            title="Gestionar direcciones IP"
          >
            <i className="fas fa-network-wired me-1"></i>
            Direcciones
          </Button>
        </div>
        
        <div className="proyecto-card-mobile-actions-full">
          <Button
            variant="warning"
            size="sm"
            onClick={() => handleEdit(proyecto)}
            title="Editar proyecto"
          >
            <i className="fas fa-edit me-1"></i>
            Editar
          </Button>
          
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(proyecto._id!)}
            title="Eliminar proyecto"
          >
            <i className="fas fa-trash me-1"></i>
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid mt-3 proyectos-container">
      <div className="d-flex justify-content-between align-items-center mb-3 proyectos-header">
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
          className="btn-nuevo-proyecto"
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
          {/* Vista de tabla para desktop */}
          <div className="proyectos-table-desktop">
            <div className="table-responsive">
              <DataTable
  columns={columns}
  data={currentItems}
  onRowClick={(proyecto) => toggleExpandProyecto(proyecto._id!)}
/>
            </div>
          </div>
          
          {/* Vista de cards para móvil */}
          <div className="proyectos-cards-mobile">
            {currentItems.map(proyecto => (
              <ProyectoCardMobile key={proyecto._id} proyecto={proyecto} />
            ))}
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

      {/* Modal de Cotizaciones */}
      <Modal 
        show={showCotizacionesModal} 
        onHide={() => setShowCotizacionesModal(false)}
        size="xl"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-file-invoice me-2"></i>
            Cotizaciones: {selectedProyecto?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingCotizaciones ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : cotizacionesProyecto.length === 0 ? (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No hay cotizaciones asociadas a este proyecto
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>No. Presupuesto</th>
                    <th>Cliente</th>
                    <th className="d-none d-md-table-cell">Fecha</th>
                    <th className="d-none d-lg-table-cell">Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacionesProyecto.map(cotizacion => (
                    <tr key={cotizacion._id}>
                      <td>{cotizacion.numeroPresupuesto}</td>
                      <td>{typeof cotizacion.cliente === 'string' ? cotizacion.cliente : cotizacion.cliente?.nombreEmpresa}</td>
                      <td className="d-none d-md-table-cell">{new Date(cotizacion.fecha).toLocaleDateString('es-MX')}</td>
                      <td className="d-none d-lg-table-cell">${cotizacion.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`badge bg-${cotizacion.estado === 'Aceptada' ? 'success' : cotizacion.estado === 'Rechazada' ? 'danger' : cotizacion.estado === 'Enviada' ? 'primary' : 'secondary'}`}>
                          {cotizacion.estado}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleEditCotizacion(cotizacion)}
                            title="Editar cotización"
                          >
                            <i className="fas fa-edit"></i>
                            <span className="d-none d-lg-inline ms-1">Editar</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => window.open(`/api/cotizaciones/${cotizacion._id}/pdf`, '_blank')}
                            title="Ver PDF"
                          >
                            <i className="fas fa-file-pdf"></i>
                            <span className="d-none d-lg-inline ms-1">PDF</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCotizacionesModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Entregas */}
      <Modal 
        show={showEntregasModal} 
        onHide={() => setShowEntregasModal(false)}
        size="xl"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-truck me-2"></i>
            Entregas: {selectedProyecto?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingEntregas ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : entregasProyecto.length === 0 ? (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No hay entregas asociadas a este proyecto
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>No. Entrega</th>
                    <th>Cliente</th>
                    <th className="d-none d-md-table-cell">Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {entregasProyecto.map(entrega => (
                    <tr key={entrega._id}>
                      <td>{entrega.numeroEntrega}</td>
                      <td>{typeof entrega.cliente === 'string' ? entrega.cliente : entrega.cliente?.nombreEmpresa}</td>
                      <td className="d-none d-md-table-cell">{new Date(entrega.fecha).toLocaleDateString('es-MX')}</td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleEditEntrega(entrega)}
                            title="Editar entrega"
                          >
                            <i className="fas fa-edit"></i>
                            <span className="d-none d-lg-inline ms-1">Editar</span>
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => window.open(`/api/entregas/${entrega._id}/pdf`, '_blank')}
                            title="Ver PDF"
                          >
                            <i className="fas fa-file-pdf"></i>
                            <span className="d-none d-lg-inline ms-1">PDF</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEntregasModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Órdenes de Compra */}
      <Modal 
        show={showOrdenesModal} 
        onHide={() => setShowOrdenesModal(false)}
        size="xl"
        fullscreen="md-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-shopping-cart me-2"></i>
            Órdenes de Compra: {selectedProyecto?.nombre}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrdenes ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : ordenesProyecto.length === 0 ? (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No hay órdenes de compra asociadas a este proyecto
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>No. Orden</th>
                    <th>Proveedor</th>
                    <th className="d-none d-md-table-cell">Fecha</th>
                    <th className="d-none d-lg-table-cell">Razón Social</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenesProyecto.map(orden => (
                    <tr key={orden._id}>
                      <td>{orden.numeroOrden}</td>
                      <td>{typeof orden.proveedor === 'string' ? orden.proveedor : orden.proveedor?.empresa}</td>
                      <td className="d-none d-md-table-cell">{new Date(orden.fecha).toLocaleDateString('es-MX')}</td>
                      <td className="d-none d-lg-table-cell">{typeof orden.razonSocial === 'string' ? orden.razonSocial : orden.razonSocial?.nombre}</td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleEditOrden(orden)}
                            title="Editar orden de compra"
                          >
                            <i className="fas fa-edit"></i>
                            <span className="d-none d-lg-inline ms-1">Editar</span>
                          </Button>
                          {orden.rutaPdf ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => window.open(`/api/ordenes-compra/${orden._id}/pdf`, '_blank')}
                              title="Ver PDF"
                            >
                              <i className="fas fa-file-pdf"></i>
                              <span className="d-none d-lg-inline ms-1">PDF</span>
                            </Button>
                          ) : (
                            <span className="text-muted small">Sin PDF</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOrdenesModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Actividades */}
      <ActividadesList
        show={showActividadesModal}
        onHide={() => setShowActividadesModal(false)}
        proyecto={selectedProyecto}
        colaboradores={colaboradores}
      />

      {/* Modal de Edición de Cotización */}
      {showEditCotizacionModal && (
        <CotizacionModal
          show={showEditCotizacionModal}
          onHide={() => {
            setShowEditCotizacionModal(false);
            setEditingCotizacion(null);
          }}
          onSave={handleSaveCotizacion}
          editingCotizacion={editingCotizacion}
          clientes={clientes}
          inventarioItems={inventarioItems}
          razonesSociales={razonesSociales}
          proyectos={proyectos}
          vendedores={vendedores}
          generatePresupuestoNumber={generatePresupuestoNumber}
        />
      )}

      {/* Modal de Edición de Entrega */}
      {showEditEntregaModal && (
        <EntregaModal
          show={showEditEntregaModal}
          onHide={() => {
            setShowEditEntregaModal(false);
            setEditingEntrega(null);
          }}
          onSave={handleSaveEntrega}
          editingEntrega={editingEntrega}
          clientes={clientes}
          inventarioItems={inventarioItems}
          razonesSociales={razonesSociales}
          proyectos={proyectos}
          generateEntregaNumber={generateEntregaNumber}
        />
      )}

      {/* Modal de Edición de Orden de Compra */}
      {showEditOrdenModal && (
        <OrdenCompraForm
          show={showEditOrdenModal}
          onHide={() => {
            setShowEditOrdenModal(false);
            setEditingOrdenId(null);
          }}
          onSave={handleSaveOrden}
          editId={editingOrdenId}
          proyectos={proyectos}
        />
      )}
      {/* Modal de Direcciones IP */}
        <DireccionesModal
          show={showDireccionesModal}
          onHide={() => setShowDireccionesModal(false)}
          proyecto={selectedProyecto}
        />
    </div>
  );
};

export default ProyectoList;
