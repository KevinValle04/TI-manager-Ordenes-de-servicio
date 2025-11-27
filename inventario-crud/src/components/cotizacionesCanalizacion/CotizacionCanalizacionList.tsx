import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Cliente, CotizacionCanalizacion, MaterialCanalizacion, RazonSocial } from '../../types';
import DataTable from '../common/DataTable';
import PaginationCompact from '../common/PaginationCompact';
import SearchBar from '../common/SearchBar';
import CotizacionCanalizacionModal from './CotizacionCanalizacionModal';

const CotizacionCanalizacionList: React.FC = () => {
  // Estados básicos
  const [cotizaciones, setCotizaciones] = useState<CotizacionCanalizacion[]>([]);
  const [filteredCotizaciones, setFilteredCotizaciones] = useState<CotizacionCanalizacion[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState<CotizacionCanalizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para datos auxiliares
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [materiales, setMateriales] = useState<MaterialCanalizacion[]>([]);
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);

  // Efectos
  useEffect(() => {
    fetchCotizaciones();
    fetchClientes();
    fetchMateriales();
    fetchRazonesSociales();
  }, []);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, cotizaciones]);

  // Funciones de carga de datos
  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/cotizaciones-canalizacion');
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

  const fetchMateriales = async () => {
    try {
      const response = await fetch('/api/material-canalizacion');
      if (!response.ok) throw new Error('Error al cargar materiales');
      const data = await response.json();
      setMateriales(data);
    } catch (error) {
      console.error('Error al cargar materiales:', error);
      setMateriales([]);
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

  // Funciones para PDF
  const handleVerPdf = (cotizacion: CotizacionCanalizacion) => {
    if (!cotizacion._id) {
      alert("ID de cotización no válido");
      return;
    }
    window.open(`/api/cotizaciones-canalizacion/${cotizacion._id}/pdf`, "_blank");
  };

  const handleDescargarPdf = (cotizacion: CotizacionCanalizacion) => {
    if (!cotizacion._id) {
      alert("ID de cotización no válido");
      return;
    }
    window.open(`/api/cotizaciones-canalizacion/${cotizacion._id}/pdf/descargar`, "_blank");
  };

  // Alternativa: Exportar PDF con jsPDF (frontend)
  const handleExportarPdfLocal = async (cotizacion: CotizacionCanalizacion) => {
    try {
      // Importar dinámicamente para evitar errores si no está instalado
      const { exportarCotizacionPDF } = await import('../../utils/pdfExporter');
      exportarCotizacionPDF(cotizacion);
    } catch (error) {
      console.log('jsPDF no disponible, usando backend...');
      handleDescargarPdf(cotizacion);
    }
  };

  // Funciones CRUD
  const generatePresupuestoNumber = () => {
    const maxNumber = cotizaciones.reduce((max, cotizacion) => {
      const match = cotizacion.numeroPresupuesto.match(/PME-(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    return `PME-${(maxNumber + 1).toString().padStart(3, '0')}`;
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value) {
      setFilteredCotizaciones(cotizaciones);
    } else {
      const lower = value.toLowerCase();
      const filtered = cotizaciones.filter(cotizacion => {
        const clienteStr = typeof cotizacion.cliente === 'string' 
          ? cotizacion.cliente 
          : cotizacion.cliente.nombreEmpresa;
        
        const razonSocialStr = !cotizacion.razonSocial 
          ? '' 
          : typeof cotizacion.razonSocial === 'string' 
            ? cotizacion.razonSocial 
            : cotizacion.razonSocial.nombre;
        
        return clienteStr.toLowerCase().includes(lower) ||
               razonSocialStr.toLowerCase().includes(lower) ||
               cotizacion.numeroPresupuesto.toLowerCase().includes(lower) ||
               cotizacion.estado.toLowerCase().includes(lower) ||
               (cotizacion.comentarios && cotizacion.comentarios.toLowerCase().includes(lower));
      });
      setFilteredCotizaciones(filtered);
    }
    setCurrentPage(1);
  };

  const getEstadoBadge = (estado: string) => {
    const variants: { [key: string]: string } = {
      'Borrador': 'secondary',
      'Enviada': 'info',
      'Aceptada': 'success',
      'Rechazada': 'danger',
      'Vencida': 'warning'
    };
    return <span className={`badge bg-${variants[estado] || 'secondary'}`}>{estado}</span>;
  };

  // Handlers del modal
  const handleNew = () => {
    setEditingCotizacion(null);
    setShowModal(true);
  };

  const handleEdit = (cotizacion: CotizacionCanalizacion) => {
    setEditingCotizacion(cotizacion);
    setShowModal(true);
  };

  const handleSave = async (formData: Partial<CotizacionCanalizacion>) => {
    try {
      console.log('=== HANDLE SAVE ===');
      console.log('Editing cotizacion:', editingCotizacion);
      console.log('Form data:', formData);
      
      const url = editingCotizacion 
        ? `/api/cotizaciones-canalizacion/${editingCotizacion._id}`
        : '/api/cotizaciones-canalizacion';
      
      const method = editingCotizacion ? 'PUT' : 'POST';
      
      console.log('URL:', url);
      console.log('Method:', method);
      console.log('Payload:', JSON.stringify(formData, null, 2));
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error del servidor:', errorData);
        alert(`Error al guardar cotización: ${response.status} - ${errorData}`);
        return;
      }

      const result = await response.json();
      console.log('Result:', result);
      console.log('=== SAVE EXITOSO ===');

      setShowModal(false);
      fetchCotizaciones();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar cotización: ${errorMessage}`);
      console.error('Error completo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta cotización?')) return;
    
    try {
      const response = await fetch(`/api/cotizaciones-canalizacion/${id}`, {
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
      render: (cotizacion: CotizacionCanalizacion) => 
        typeof cotizacion.cliente === 'string' 
          ? cotizacion.cliente 
          : cotizacion.cliente.nombreEmpresa
    },
    { 
      key: 'razonSocial', 
      label: 'Razón Social',
      render: (cotizacion: CotizacionCanalizacion) => {
        if (!cotizacion.razonSocial) return 'No asignada';
        return typeof cotizacion.razonSocial === 'string' 
          ? cotizacion.razonSocial 
          : cotizacion.razonSocial.nombre;
      }
    },
    { 
      key: 'total', 
      label: 'Total',
      render: (cotizacion: CotizacionCanalizacion) => `$${cotizacion.total.toFixed(2)}`
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (cotizacion: CotizacionCanalizacion) => getEstadoBadge(cotizacion.estado)
    },
    {
      key: 'comentarios',
      label: 'Comentarios',
      render: (cotizacion: CotizacionCanalizacion) => {
        const comentarios = cotizacion.comentarios || '';
        if (comentarios.length > 50) {
          return (
            <span title={comentarios}>
              {comentarios.substring(0, 47)}...
            </span>
          );
        }
        return comentarios;
      }
    },
    {
      key: 'fechaCreacion',
      label: 'Fecha',
      render: (cotizacion: CotizacionCanalizacion) => new Date(cotizacion.fechaCreacion).toLocaleDateString()
    }
  ];

  // Paginación
  const totalPages = Math.ceil(filteredCotizaciones.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredCotizaciones.slice(startIndex, startIndex + itemsPerPage);

  if (loading) return <div>Cargando...</div>;

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      
      {/* Barra de búsqueda y controles */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por presupuesto, cliente o estado..."
          className="flex-grow-1"
        />
        <div className="d-flex gap-2">
          <Button variant="success" onClick={handleNew}>
            Nueva Cotización
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando cotizaciones...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="table-responsive" style={{ 
            minHeight: `calc(100vh - 270px)`, 
            maxHeight: `calc(100vh - 270px)`, 
            overflowY: "auto", 
            background: "#fff", 
            borderRadius: 8, 
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)" 
          }}>
            <DataTable
              data={currentItems}
              columns={columns}
              actions={(cotizacion) => (
                <div className="d-flex flex-column flex-sm-row align-items-stretch gap-1">
                  <Button
                    variant="warning"
                    size="sm"
                    className="w-100 w-sm-auto"
                    onClick={() => handleEdit(cotizacion)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="info"
                    size="sm"
                    className="w-100 w-sm-auto"
                    onClick={() => handleVerPdf(cotizacion)}
                    title="Ver PDF"
                  >
                    Ver
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-100 w-sm-auto"
                    onClick={() => handleDescargarPdf(cotizacion)}
                    title="Descargar PDF"
                  >
                    📄
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-100 w-sm-auto"
                    onClick={() => handleDelete(cotizacion._id!)}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
              className="small"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div className="d-flex justify-content-center my-3">
            <PaginationCompact
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* Modal de formulario */}
      <CotizacionCanalizacionModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleSave}
        editingCotizacion={editingCotizacion}
        clientes={clientes}
        materiales={materiales}
        razonesSociales={razonesSociales}
        generatePresupuestoNumber={generatePresupuestoNumber}
      />
    </div>
  );
};

export default CotizacionCanalizacionList;
