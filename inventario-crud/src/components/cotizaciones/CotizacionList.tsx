import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Cliente, Cotizacion, IInventoryItem, Proyecto, RazonSocial, Vendedor } from '../../types';
import DataTable from '../common/DataTable';
import PaginationCompact from '../common/PaginationCompact';
import SearchBar from '../common/SearchBar';
import CotizacionModal from './CotizacionModal.tsx';

const CotizacionList: React.FC = () => {
  // Estados básicos
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [filteredCotizaciones, setFilteredCotizaciones] = useState<Cotizacion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState<Cotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para datos auxiliares
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [inventarioItems, setInventarioItems] = useState<IInventoryItem[]>([]);
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);

  // Efectos
  useEffect(() => {
    fetchCotizaciones();
    fetchClientes();
    fetchInventarioItems();
    fetchRazonesSociales();
    fetchProyectos();
    fetchVendedores();
  }, []);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, cotizaciones]);

  // Funciones de carga de datos
  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/cotizaciones');
      if (!response.ok) throw new Error('Error al cargar cotizaciones');
      const data = await response.json();
      setCotizaciones(data);
      setFilteredCotizaciones(data);
    } catch (error) {
      console.error('Error al cargar cotizaciones:', error);
      setError('Error al cargar las cotizaciones');
      setCotizaciones([]);
      setFilteredCotizaciones([]);
    } finally {
      setLoading(false);
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
      console.log('Iniciando carga de inventario interior...');
      const response = await fetch('/api/inventario');
      if (!response.ok) {
        console.error('Error en la respuesta del servidor:', response.status, response.statusText);
        throw new Error('Error al cargar items de inventario');
      }
      const data = await response.json();
      console.log('Items de inventario cargados:', data);
      setInventarioItems(data);
    } catch (error) {
      console.error('Error al cargar items de inventario:', error);
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

  const fetchProyectos = async () => {
    try {
      const response = await fetch('/api/proyectos');
      if (!response.ok) throw new Error('Error al cargar proyectos');
      const data = await response.json();
      setProyectos(data);
    } catch (error) {
      console.error('Error al cargar proyectos:', error);
      setProyectos([]);
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

  // Funciones para PDF
  const handleVerPdf = (cotizacion: Cotizacion) => {
    if (!cotizacion._id) {
      alert("ID de cotización no válido");
      return;
    }
    window.open(`/api/cotizaciones/${cotizacion._id}/pdf`, "_blank");
  };

  const handleDescargarPdf = (cotizacion: Cotizacion) => {
    if (!cotizacion._id) {
      alert("ID de cotización no válido");
      return;
    }
    window.open(`/api/cotizaciones/${cotizacion._id}/pdf/descargar`, "_blank");
  };

  // Funciones para PDF Checklist
  const handleVerPdfChecklist = (cotizacion: Cotizacion) => {
    if (!cotizacion._id) {
      alert("ID de cotización no válido");
      return;
    }
    window.open(`/api/cotizaciones/${cotizacion._id}/pdf-checklist`, "_blank");
  };

  const handleDescargarPdfChecklist = (cotizacion: Cotizacion) => {
    if (!cotizacion._id) {
      alert("ID de cotización no válido");
      return;
    }
    window.open(`/api/cotizaciones/${cotizacion._id}/pdf-checklist/descargar`, "_blank");
  };

  // Funciones para la interfaz
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredCotizaciones(cotizaciones);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = cotizaciones.filter(cotizacion => 
      cotizacion.numeroPresupuesto.toLowerCase().includes(lowerTerm) ||
      (typeof cotizacion.cliente === 'string' 
        ? cotizacion.cliente.toLowerCase().includes(lowerTerm)
        : cotizacion.cliente.nombreEmpresa.toLowerCase().includes(lowerTerm)) ||
      cotizacion.estado.toLowerCase().includes(lowerTerm)
    );
    
    setFilteredCotizaciones(filtered);
    setCurrentPage(1);
  };

  const handleEdit = (cotizacion: Cotizacion) => {
    setEditingCotizacion(cotizacion);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta cotización?')) return;
    
    try {
      const response = await fetch(`/api/cotizaciones/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('Error al eliminar la cotización');
        return;
      }

      fetchCotizaciones();
    } catch (error) {
      alert('Error al eliminar la cotización');
      console.error('Error:', error);
    }
  };

  // Definición de columnas
  const columns = [
    { key: 'numeroPresupuesto', label: 'No. Presupuesto' },
    { 
      key: 'cliente', 
      label: 'Cliente',
      render: (cotizacion: Cotizacion) => {
        if (!cotizacion.cliente) return 'Sin cliente';
        return typeof cotizacion.cliente === 'string' 
          ? cotizacion.cliente 
          : cotizacion.cliente.nombreEmpresa;
      }
    },
    { 
      key: 'fecha', 
      label: 'Fecha',
      render: (cotizacion: Cotizacion) => new Date(cotizacion.fecha).toLocaleDateString()
    },
    { 
      key: 'vigencia', 
      label: 'Vigencia',
      render: (cotizacion: Cotizacion) => new Date(cotizacion.vigencia).toLocaleDateString()
    },
    { 
      key: 'subtotal', 
      label: 'Subtotal',
      render: (cotizacion: Cotizacion) => `$${cotizacion.subtotal.toFixed(2)}`
    },
    { 
      key: 'total', 
      label: 'Total',
      render: (cotizacion: Cotizacion) => `$${cotizacion.total.toFixed(2)}`
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (cotizacion: Cotizacion) => (
        <span className={`badge bg-${getEstadoClass(cotizacion.estado)}`}>
          {cotizacion.estado}
        </span>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (cotizacion: Cotizacion) => (
        <>
          <Button
            variant="primary"
            size="sm"
            className="me-1 mb-1"
            onClick={() => handleVerPdf(cotizacion)}
            title="Ver PDF con precios"
          >
            <i className="fas fa-file-pdf me-1"></i>Ver PDF Precios
          </Button>
          <Button
            variant="success"
            size="sm"
            className="me-1 mb-1"
            onClick={() => handleDescargarPdf(cotizacion)}
            title="Descargar PDF con precios"
          >
            <i className="fas fa-download me-1"></i>Descargar PDF
          </Button>
          <Button
            variant="info"
            size="sm"
            className="me-1 mb-1"
            onClick={() => handleVerPdfChecklist(cotizacion)}
            title="Ver checklist sin precios"
          >
            <i className="fas fa-list-check me-1"></i>Ver Checklist
          </Button>
          <Button
            variant="outline-info"
            size="sm"
            className="me-1 mb-1"
            onClick={() => handleDescargarPdfChecklist(cotizacion)}
            title="Descargar checklist sin precios"
          >
            <i className="fas fa-download me-1"></i>Descargar Checklist
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="me-1 mb-1"
            onClick={() => handleEdit(cotizacion)}
          >
            <i className="fas fa-edit me-1"></i>Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            className="mb-1"
            onClick={() => handleDelete(cotizacion._id!)}
          >
            <i className="fas fa-trash me-1"></i>Eliminar
          </Button>
        </>
      )
    }
  ];

  // Funciones de negocio
  const generatePresupuestoNumber = () => {
    const maxNumber = cotizaciones.reduce((max, cotizacion) => {
      const match = cotizacion.numeroPresupuesto.match(/P-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    return `P-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const getEstadoClass = (estado: string) => {
    switch (estado) {
      case 'Borrador': return 'secondary';
      case 'Enviada': return 'primary';
      case 'Aceptada': return 'success';
      case 'Rechazada': return 'danger';
      case 'Vencida': return 'warning';
      default: return 'secondary';
    }
  };

  // Cálculos de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCotizaciones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage);

  // Función para guardar cotización
  const handleSave = async (data: Partial<Cotizacion>) => {
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
        const errorData = await response.json().catch(() => ({}));
        
        // Mostrar mensaje de error específico del servidor
        let errorMessage = 'Error al guardar la cotización';
        if (errorData.details) {
          errorMessage = errorData.details;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        // Si hay errores específicos de validación, mostrar el primero
        if (errorData.errores && errorData.errores.length > 0) {
          errorMessage = errorData.errores[0].mensaje;
        }
        
        alert(`${errorMessage}`);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Cotización guardada exitosamente:', result);
      
      fetchCotizaciones();
      setShowModal(false);
      setEditingCotizacion(null);
      
      // Mostrar mensaje de éxito
      alert(`Cotización ${data._id ? 'actualizada' : 'creada'} exitosamente`);
      
    } catch (error) {
      console.error('Error al guardar cotización:', error);
      // El error ya se mostró en el bloque anterior
    }
  };

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-end mb-3">
        <Button onClick={() => {
          setEditingCotizacion(null); // Limpiar cualquier cotización en edición
          setShowModal(true);
        }}>Nueva Cotización</Button>
      </div>

      <div style={{ paddingBottom: '16px' }}>
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por número, cliente o estado..."
        />
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <>
          <div className="table-responsive">
            <DataTable
              columns={columns}
              data={currentItems}
            />
            <PaginationCompact
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* Modal de formulario */}
      <CotizacionModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setEditingCotizacion(null); // Limpiar estado de edición al cerrar modal
        }}
        onSave={handleSave}
        editingCotizacion={editingCotizacion}
        clientes={clientes}
        inventarioItems={inventarioItems}
        razonesSociales={razonesSociales}
        proyectos={proyectos}
        vendedores={vendedores}
        generatePresupuestoNumber={generatePresupuestoNumber}
      />
    </div>
  );
};

export default CotizacionList;