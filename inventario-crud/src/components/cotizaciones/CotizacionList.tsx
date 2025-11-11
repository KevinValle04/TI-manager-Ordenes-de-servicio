import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Cliente, Cotizacion, IInventoryItem, RazonSocial, Proyecto } from '../../types';
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

  // Efectos
  useEffect(() => {
    fetchCotizaciones();
    fetchClientes();
    fetchInventarioItems();
    fetchRazonesSociales();
    fetchProyectos();
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
      render: (cotizacion: Cotizacion) => 
        typeof cotizacion.cliente === 'string' 
          ? cotizacion.cliente 
          : cotizacion.cliente.nombreEmpresa
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
            className="me-2"
            onClick={() => handleVerPdf(cotizacion)}
          >
            Ver PDF
          </Button>
          <Button
            variant="success"
            size="sm"
            className="me-2"
            onClick={() => handleDescargarPdf(cotizacion)}
          >
            Descargar
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="me-2"
            onClick={() => handleEdit(cotizacion)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(cotizacion._id!)}
          >
            Eliminar
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
        throw new Error('Error al guardar la cotización');
      }

      fetchCotizaciones();
      setShowModal(false);
      setEditingCotizacion(null);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la cotización');
    }
  };

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Cotizaciones</h2>
        <Button onClick={() => setShowModal(true)}>Nueva Cotización</Button>
      </div>

      <SearchBar
        value={searchTerm}
        onChange={handleSearch}
        placeholder="Buscar por número, cliente o estado..."
      />

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
        onHide={() => setShowModal(false)}
        onSave={handleSave}
        editingCotizacion={editingCotizacion}
        clientes={clientes}
        inventarioItems={inventarioItems}
        razonesSociales={razonesSociales}
        proyectos={proyectos}
        generatePresupuestoNumber={generatePresupuestoNumber}
      />
    </div>
  );
};

export default CotizacionList;