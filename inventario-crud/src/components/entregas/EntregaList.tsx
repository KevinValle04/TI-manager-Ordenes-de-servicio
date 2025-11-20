import React, { useEffect, useState } from 'react';
import { Button } from 'react-bootstrap';
import { Cliente, Entrega, IInventoryItem, RazonSocial, Proyecto } from '../../types';
import DataTable from '../common/DataTable';
import PaginationCompact from '../common/PaginationCompact';
import SearchBar from '../common/SearchBar';
import EntregaModal from './EntregaModal.tsx';

const EntregaList: React.FC = () => {
  // Estados básicos
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [filteredEntregas, setFilteredEntregas] = useState<Entrega[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState<Entrega | null>(null);
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
    fetchEntregas();
    fetchClientes();
    fetchInventarioItems();
    fetchRazonesSociales();
    fetchProyectos();
  }, []);

  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, entregas]);

  // Funciones de carga de datos
  const fetchEntregas = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/entregas');
      if (!response.ok) throw new Error('Error al cargar entregas');
      const data = await response.json();
      setEntregas(data);
      setFilteredEntregas(data);
    } catch (error) {
      console.error('Error al cargar entregas:', error);
      setError('Error al cargar las entregas');
      setEntregas([]);
      setFilteredEntregas([]);
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
  const handleVerPdf = (Entrega: Entrega) => {
    if (!Entrega._id) {
      alert("ID de entrega no válido");
      return;
    }
    window.open(`/api/entregas/${Entrega._id}/pdf`, "_blank");
  };

  const handleDescargarPdf = (Entrega: Entrega) => {
    if (!Entrega._id) {
      alert("ID de entrega no válido");
      return;
    }
    window.open(`/api/entregas/${Entrega._id}/pdf/descargar`, "_blank");
  };

  // Funciones para la interfaz
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredEntregas(entregas);
      return;
    }
    
    const lowerTerm = term.toLowerCase();
    const filtered = entregas.filter(Entrega => 
      Entrega.numeroPresupuesto.toLowerCase().includes(lowerTerm) ||
      (typeof Entrega.cliente === 'string' 
        ? Entrega.cliente.toLowerCase().includes(lowerTerm)
        : Entrega.cliente.nombreEmpresa.toLowerCase().includes(lowerTerm)) ||
      Entrega.estado.toLowerCase().includes(lowerTerm)
    );
    
    setFilteredEntregas(filtered);
    setCurrentPage(1);
  };

  const handleEdit = (Entrega: Entrega) => {
    setEditingEntrega(Entrega);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta entrega?')) return;
    
    try {
      const response = await fetch(`/api/entregas/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        alert('Error al eliminar la entrega');
        return;
      }

      fetchEntregas();
    } catch (error) {
      alert('Error al eliminar la entrega');
      console.error('Error:', error);
    }
  };

  // Definición de columnas
  const columns = [
    { key: 'numeroPresupuesto', label: 'No. Presupuesto' },
    { 
      key: 'cliente', 
      label: 'Cliente',
      render: (Entrega: Entrega) => 
        typeof Entrega.cliente === 'string' 
          ? Entrega.cliente 
          : Entrega.cliente.nombreEmpresa
    },
    { 
      key: 'fecha', 
      label: 'Fecha',
      render: (Entrega: Entrega) => new Date(Entrega.fecha).toLocaleDateString()
    },
    { 
      key: 'vigencia', 
      label: 'Vigencia',
      render: (Entrega: Entrega) => new Date(Entrega.vigencia).toLocaleDateString()
    },
    { 
      key: 'subtotal', 
      label: 'Subtotal',
      render: (Entrega: Entrega) => `$${Entrega.subtotal.toFixed(2)}`
    },
    { 
      key: 'total', 
      label: 'Total',
      render: (Entrega: Entrega) => `$${Entrega.total.toFixed(2)}`
    },
    { 
      key: 'estado', 
      label: 'Estado',
      render: (Entrega: Entrega) => (
        <span className={`badge bg-${getEstadoClass(Entrega.estado)}`}>
          {Entrega.estado}
        </span>
      )
    },
    {
      key: 'acciones',
      label: 'Acciones',
      render: (Entrega: Entrega) => (
        <>
          <Button
            variant="primary"
            size="sm"
            className="me-2"
            onClick={() => handleVerPdf(Entrega)}
          >
            Ver PDF
          </Button>
          <Button
            variant="success"
            size="sm"
            className="me-2"
            onClick={() => handleDescargarPdf(Entrega)}
          >
            Descargar
          </Button>
          <Button
            variant="warning"
            size="sm"
            className="me-2"
            onClick={() => handleEdit(Entrega)}
          >
            Editar
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDelete(Entrega._id!)}
          >
            Eliminar
          </Button>
        </>
      )
    }
  ];

  // Funciones de negocio
  const generatePresupuestoNumber = () => {
    const maxNumber = entregas.reduce((max, Entrega) => {
      const match = Entrega.numeroPresupuesto.match(/P-(\d+)/);
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
  const currentItems = filteredEntregas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntregas.length / itemsPerPage);

  // Función para guardar cotización
  const handleSave = async (data: Partial<Entrega>) => {
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
        throw new Error('Error al guardar la entrega');
      }

      fetchEntregas();
      setShowModal(false);
      setEditingEntrega(null);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la entrega');
    }
  };

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Entregas</h2>
        <Button onClick={() => setShowModal(true)}>Nueva Entrega</Button>
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
      <EntregaModal
        show={showModal}
        onHide={() => setShowModal(false)}
        onSave={handleSave}
        editingEntrega={editingEntrega}
        clientes={clientes}
        inventarioItems={inventarioItems}
        razonesSociales={razonesSociales}
        proyectos={proyectos}
        generatePresupuestoNumber={generatePresupuestoNumber}
      />
    </div>
  );
};

export default EntregaList;
