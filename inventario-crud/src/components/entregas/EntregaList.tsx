import React, { useEffect, useState } from 'react';
import { Button, Dropdown } from 'react-bootstrap';
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
      Entrega.numeroEntrega.toLowerCase().includes(lowerTerm) ||
      (typeof Entrega.cliente === 'string' 
        ? Entrega.cliente.toLowerCase().includes(lowerTerm)
        : Entrega.cliente.nombreEmpresa.toLowerCase().includes(lowerTerm))
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
    { key: 'numeroEntrega', label: 'No. de Entrega' },
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
      key: 'acciones',
      label: 'Acciones',
      style: { minWidth: '200px' } as React.CSSProperties,
      render: (Entrega: Entrega) => (
        <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => handleVerPdf(Entrega)}
            title="Ver PDF"
          >
            <i className="fas fa-eye"></i>
          </Button>
          <Button
            variant="outline-success"
            size="sm"
            onClick={() => handleDescargarPdf(Entrega)}
            title="Descargar PDF"
          >
            <i className="fas fa-download"></i>
          </Button>
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => handleEdit(Entrega)}
            title="Editar"
          >
            <i className="fas fa-pencil-alt"></i>
          </Button>
          <Dropdown drop="down">
            <Dropdown.Toggle variant="outline-secondary" size="sm" id={`dropdown-${Entrega._id}`}>
              <i className="fas fa-ellipsis-v"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu align="end" className="bg-white shadow border">
              <Dropdown.Item 
                onClick={() => handleDelete(Entrega._id!)} 
                className="text-danger"
                style={{ backgroundColor: 'white' }}
              >
                <i className="fas fa-trash me-2"></i>Eliminar
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      )
    }
  ];

  const generateEntregaNumber = (clienteNombre: string) => {
    if (!clienteNombre || clienteNombre.trim() === '') {
      return 'XX-XX-0001';
    }
    
    // Limpiar el nombre del cliente (eliminar espacios y caracteres especiales)
    const nombreLimpio = clienteNombre.toUpperCase().replace(/[^A-Z]/g, '');
    
    if (nombreLimpio.length < 2) {
      return 'XX-XX-0001';
    }
    
    // Obtener las primeras 2 letras
    const primerasLetras = nombreLimpio.substring(0, 2);
    
    // Obtener las últimas 2 letras
    const ultimasLetras = nombreLimpio.substring(nombreLimpio.length - 2);
    
    // Construir el prefijo del cliente
    const prefijoCliente = `${primerasLetras}-${ultimasLetras}`;
    
    // Filtrar entregas que pertenezcan al mismo cliente
    // Comparar por nombre de cliente exacto (normalizado)
    const entregasDelCliente = entregas.filter(entrega => {
      const clienteEntrega = typeof entrega.cliente === 'string' 
        ? entrega.cliente 
        : entrega.cliente?.nombreEmpresa || '';
      
      // Normalizar ambos nombres para comparación
      const nombreEntregaNormalizado = clienteEntrega.toUpperCase().trim();
      const nombreClienteNormalizado = clienteNombre.toUpperCase().trim();
      
      return nombreEntregaNormalizado === nombreClienteNormalizado;
    });
    
    console.log('=== GENERACIÓN NÚMERO DE ENTREGA ===');
    console.log('Cliente:', clienteNombre);
    console.log('Prefijo generado:', prefijoCliente);
    console.log('Total entregas en sistema:', entregas.length);
    console.log('Entregas del cliente:', entregasDelCliente.length);
    
    // Encontrar el número más alto para este cliente específico
    const maxNumber = entregasDelCliente.reduce((max, entrega) => {
      // Extraer el número del formato XX-XX-####
      const match = entrega.numeroEntrega.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1]);
        console.log(`  - Entrega ${entrega.numeroEntrega}: número ${num}`);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    
    const nuevoNumero = `${prefijoCliente}-${String(maxNumber + 1).padStart(4, '0')}`;
    console.log('Último número encontrado:', maxNumber);
    console.log('Nuevo número generado:', nuevoNumero);
    console.log('====================================');
    
    return nuevoNumero;
  };

  // Cálculos de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredEntregas.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEntregas.length / itemsPerPage);

  // Función para manejar el cierre del modal
  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEntrega(null);
  };

  // Función para abrir modal de nueva entrega
  const handleNewEntrega = () => {
    setEditingEntrega(null);
    setShowModal(true);
  };

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
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar:', error);
      alert('Error al guardar la entrega');
    }
  };

  return (
    <div className="container-fluid mt-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Entregas</h2>
        <Button onClick={handleNewEntrega}>Nueva Entrega</Button>
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
        onHide={handleCloseModal}
        onSave={handleSave}
        editingEntrega={editingEntrega}
        clientes={clientes}
        inventarioItems={inventarioItems}
        razonesSociales={razonesSociales}
        proyectos={proyectos}
        generateEntregaNumber={generateEntregaNumber}
      />
    </div>
  );
};

export default EntregaList;
