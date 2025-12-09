import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Alert, Spinner, Form, InputGroup } from 'react-bootstrap';
import { Vehiculo, HistorialServicio } from '../types';
import VehiculoCard from '../components/vehiculos/VehiculoCard';
import VehiculoFormModal from '../components/vehiculos/VehiculoFormModal';
import ServicioModal from '../components/vehiculos/ServicioModal';
import './Vehiculos.css';

const Vehiculos: React.FC = () => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [vehiculosFiltrados, setVehiculosFiltrados] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showServicioModal, setShowServicioModal] = useState(false);
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<Vehiculo | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'al-dia' | 'proximo' | 'vencido'>('todos');

  useEffect(() => {
    cargarVehiculos();
  }, []);

  useEffect(() => {
    filtrarVehiculos();
  }, [vehiculos, busqueda, filtroEstado]);

  const cargarVehiculos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/vehiculos');
      
      if (!response.ok) {
        throw new Error('Error al cargar vehículos');
      }
      
      const data = await response.json();
      setVehiculos(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar vehículos:', err);
      setError('Error al cargar los vehículos. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const filtrarVehiculos = () => {
    let resultado = [...vehiculos];

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(v => 
        v.marca.toLowerCase().includes(busquedaLower) ||
        v.modelo.toLowerCase().includes(busquedaLower) ||
        v.color.toLowerCase().includes(busquedaLower) ||
        v.placas?.toLowerCase().includes(busquedaLower) ||
        v.año.toString().includes(busquedaLower)
      );
    }

    // Filtrar por estado de servicio
    if (filtroEstado !== 'todos') {
      resultado = resultado.filter(v => {
        const dias = calcularDiasHastaServicio(v);
        
        switch (filtroEstado) {
          case 'vencido':
            return dias !== null && dias < 0;
          case 'proximo':
            return dias !== null && dias >= 0 && dias <= 30;
          case 'al-dia':
            return dias === null || dias > 30;
          default:
            return true;
        }
      });
    }

    setVehiculosFiltrados(resultado);
  };

  const calcularDiasHastaServicio = (vehiculo: Vehiculo): number | null => {
    if (!vehiculo.proximoServicio) return null;
    const ahora = new Date();
    const proximo = new Date(vehiculo.proximoServicio);
    const diferencia = proximo.getTime() - ahora.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  };

  const handleAgregarVehiculo = () => {
    setVehiculoSeleccionado(null);
    setShowFormModal(true);
  };

  const handleEditarVehiculo = (vehiculo: Vehiculo) => {
    setVehiculoSeleccionado(vehiculo);
    setShowFormModal(true);
  };

  const handleEliminarVehiculo = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este vehículo?')) {
      return;
    }

    try {
      const response = await fetch(`/api/vehiculos/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Error al eliminar vehículo');
      }

      await cargarVehiculos();
      alert('Vehículo eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar vehículo:', err);
      alert('Error al eliminar el vehículo. Por favor intenta de nuevo.');
    }
  };

  const handleRegistrarServicio = (vehiculo: Vehiculo) => {
    setVehiculoSeleccionado(vehiculo);
    setShowServicioModal(true);
  };

  const handleGuardarVehiculo = async (vehiculoData: Partial<Vehiculo>) => {
    try {
      const url = vehiculoSeleccionado 
        ? `/api/vehiculos/${vehiculoSeleccionado._id}`
        : '/api/vehiculos';
      
      const method = vehiculoSeleccionado ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vehiculoData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.mensaje || 'Error al guardar vehículo');
      }

      await cargarVehiculos();
      alert(vehiculoSeleccionado ? 'Vehículo actualizado exitosamente' : 'Vehículo agregado exitosamente');
    } catch (err: any) {
      console.error('Error al guardar vehículo:', err);
      alert(err.message || 'Error al guardar el vehículo. Por favor intenta de nuevo.');
      throw err;
    }
  };

  const handleGuardarServicio = async (servicioData: Partial<HistorialServicio>) => {
    if (!vehiculoSeleccionado) return;

    try {
      const response = await fetch(`/api/vehiculos/${vehiculoSeleccionado._id}/servicios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(servicioData)
      });

      if (!response.ok) {
        throw new Error('Error al registrar servicio');
      }

      await cargarVehiculos();
      alert('Servicio registrado exitosamente');
    } catch (err) {
      console.error('Error al registrar servicio:', err);
      alert('Error al registrar el servicio. Por favor intenta de nuevo.');
      throw err;
    }
  };

  const handleEliminarServicio = async (servicioId: string) => {
    if (!vehiculoSeleccionado) return;

    try {
      const response = await fetch(
        `/api/vehiculos/${vehiculoSeleccionado._id}/servicios/${servicioId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Error al eliminar servicio');
      }

      // Actualizar el vehículo seleccionado con los datos actualizados
      const vehiculoActualizadoResponse = await fetch(`/api/vehiculos/${vehiculoSeleccionado._id}`);
      const vehiculoActualizado = await vehiculoActualizadoResponse.json();
      setVehiculoSeleccionado(vehiculoActualizado);

      await cargarVehiculos();
      alert('Servicio eliminado exitosamente');
    } catch (err) {
      console.error('Error al eliminar servicio:', err);
      alert('Error al eliminar el servicio. Por favor intenta de nuevo.');
    }
  };

  const contarVehiculosPorEstado = () => {
    const contadores = {
      vencidos: 0,
      proximos: 0,
      alDia: 0
    };

    vehiculos.forEach(v => {
      const dias = calcularDiasHastaServicio(v);
      if (dias === null || dias > 30) {
        contadores.alDia++;
      } else if (dias < 0) {
        contadores.vencidos++;
      } else {
        contadores.proximos++;
      }
    });

    return contadores;
  };

  const estadisticas = contarVehiculosPorEstado();

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Cargando vehículos...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="vehiculos-page py-4">
      <div className="page-header mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h2 className="mb-1">
              <i className="fas fa-car me-2"></i>
              Vehículos
            </h2>
            <p className="text-muted mb-0">
              Gestión de vehículos de la empresa y seguimiento de servicios
            </p>
          </div>
          <Button variant="primary" onClick={handleAgregarVehiculo}>
            <i className="fas fa-plus me-2"></i>
            Agregar Vehículo
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      <Row className="mb-4">
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon bg-primary">
              <i className="fas fa-car"></i>
            </div>
            <div className="stat-info">
              <h3>{vehiculos.length}</h3>
              <p>Total Vehículos</p>
            </div>
          </div>
        </Col>
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon bg-success">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{estadisticas.alDia}</h3>
              <p>Al Día</p>
            </div>
          </div>
        </Col>
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon bg-warning">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <div className="stat-info">
              <h3>{estadisticas.proximos}</h3>
              <p>Próximos a Servicio</p>
            </div>
          </div>
        </Col>
        <Col md={3}>
          <div className="stat-card">
            <div className="stat-icon bg-danger">
              <i className="fas fa-times-circle"></i>
            </div>
            <div className="stat-info">
              <h3>{estadisticas.vencidos}</h3>
              <p>Servicio Vencido</p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-4">
        <Col md={6}>
          <InputGroup>
            <InputGroup.Text>
              <i className="fas fa-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por marca, modelo, color, placas o año..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={6}>
          <Form.Select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as any)}
          >
            <option value="todos">Todos los vehículos</option>
            <option value="al-dia">Al día</option>
            <option value="proximo">Próximos a servicio (30 días)</option>
            <option value="vencido">Servicio vencido</option>
          </Form.Select>
        </Col>
      </Row>

      {/* Grid de vehículos */}
      {vehiculosFiltrados.length === 0 ? (
        <div className="empty-state">
          <i className="fas fa-car fa-4x mb-3"></i>
          <h4>No hay vehículos registrados</h4>
          <p className="text-muted">
            {busqueda || filtroEstado !== 'todos'
              ? 'No se encontraron vehículos con los filtros aplicados'
              : 'Comienza agregando vehículos a tu flota'}
          </p>
          {!busqueda && filtroEstado === 'todos' && (
            <Button variant="primary" onClick={handleAgregarVehiculo} className="mt-3">
              <i className="fas fa-plus me-2"></i>
              Agregar Primer Vehículo
            </Button>
          )}
        </div>
      ) : (
        <Row className="g-4">
          {vehiculosFiltrados.map((vehiculo) => (
            <Col key={vehiculo._id} xs={12} md={6} lg={4} xl={3}>
              <VehiculoCard
                vehiculo={vehiculo}
                onEdit={handleEditarVehiculo}
                onDelete={handleEliminarVehiculo}
                onRegistrarServicio={handleRegistrarServicio}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* Modales */}
      <VehiculoFormModal
        show={showFormModal}
        onHide={() => {
          setShowFormModal(false);
          setVehiculoSeleccionado(null);
        }}
        vehiculo={vehiculoSeleccionado}
        onSave={handleGuardarVehiculo}
      />

      <ServicioModal
        show={showServicioModal}
        onHide={() => {
          setShowServicioModal(false);
          setVehiculoSeleccionado(null);
        }}
        vehiculo={vehiculoSeleccionado}
        onRegistrarServicio={handleGuardarServicio}
        onEliminarServicio={handleEliminarServicio}
      />
    </Container>
  );
};

export default Vehiculos;
