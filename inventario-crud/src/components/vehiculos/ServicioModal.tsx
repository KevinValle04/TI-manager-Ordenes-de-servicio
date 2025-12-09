import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Table, Badge } from 'react-bootstrap';
import { Vehiculo, HistorialServicio } from '../../types';
import './ServicioModal.css';

interface ServicioModalProps {
  show: boolean;
  onHide: () => void;
  vehiculo: Vehiculo | null;
  onRegistrarServicio: (servicioData: Partial<HistorialServicio>) => Promise<void>;
  onEliminarServicio?: (servicioId: string) => Promise<void>;
}

const ServicioModal: React.FC<ServicioModalProps> = ({
  show,
  onHide,
  vehiculo,
  onRegistrarServicio,
  onEliminarServicio
}) => {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    kilometraje: '',
    costo: '',
    realizadoPor: ''
  });

  const [saving, setSaving] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  useEffect(() => {
    if (show) {
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        descripcion: '',
        kilometraje: '',
        costo: '',
        realizadoPor: ''
      });
      setMostrarHistorial(false);
    }
  }, [show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fecha) {
      alert('La fecha es requerida');
      return;
    }

    setSaving(true);
    try {
      const servicioData: Partial<HistorialServicio> = {
        fecha: new Date(formData.fecha),
        descripcion: formData.descripcion || undefined,
        kilometraje: formData.kilometraje ? parseFloat(formData.kilometraje) : undefined,
        costo: formData.costo ? parseFloat(formData.costo) : undefined,
        realizadoPor: formData.realizadoPor || undefined
      };

      await onRegistrarServicio(servicioData);
      onHide();
    } catch (error) {
      console.error('Error al registrar servicio:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatearFecha = (fecha: Date | string): string => {
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatearMoneda = (cantidad: number | undefined): string => {
    if (!cantidad) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(cantidad);
  };

  const handleEliminar = async (servicioId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este servicio del historial?')) {
      return;
    }

    if (onEliminarServicio) {
      try {
        await onEliminarServicio(servicioId);
      } catch (error) {
        console.error('Error al eliminar servicio:', error);
      }
    }
  };

  if (!vehiculo) return null;

  const historialOrdenado = vehiculo.historialServicios 
    ? [...vehiculo.historialServicios].sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )
    : [];

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-tools me-2"></i>
          Servicio - {vehiculo.marca} {vehiculo.modelo}
        </Modal.Title>
      </Modal.Header>

      {!mostrarHistorial ? (
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="mb-3">
              <h6 className="text-muted">Registrar Nuevo Servicio</h6>
              <p className="small text-muted">
                El próximo servicio se calculará automáticamente para 6 meses después de la fecha ingresada.
              </p>
            </div>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Fecha del Servicio <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kilometraje</Form.Label>
                  <Form.Control
                    type="number"
                    name="kilometraje"
                    value={formData.kilometraje}
                    onChange={handleChange}
                    placeholder="Ej: 50000"
                    min="0"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Costo</Form.Label>
                  <Form.Control
                    type="number"
                    name="costo"
                    value={formData.costo}
                    onChange={handleChange}
                    placeholder="Ej: 2500"
                    min="0"
                    step="0.01"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Realizado Por</Form.Label>
                  <Form.Control
                    type="text"
                    name="realizadoPor"
                    value={formData.realizadoPor}
                    onChange={handleChange}
                    placeholder="Ej: Taller Mecánico XYZ"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Descripción del Servicio</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                placeholder="Ej: Cambio de aceite, filtros, revisión de frenos..."
              />
            </Form.Group>

            {historialOrdenado.length > 0 && (
              <div className="alert alert-info d-flex justify-content-between align-items-center">
                <div>
                  <i className="fas fa-history me-2"></i>
                  Este vehículo tiene {historialOrdenado.length} servicio(s) registrado(s)
                </div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setMostrarHistorial(true)}
                >
                  Ver Historial
                </Button>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={onHide} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="success" type="submit" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Registrando...
                </>
              ) : (
                <>
                  <i className="fas fa-check me-2"></i>
                  Registrar Servicio
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      ) : (
        <>
          <Modal.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                <i className="fas fa-history me-2"></i>
                Historial de Servicios
              </h6>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setMostrarHistorial(false)}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Volver
              </Button>
            </div>

            {historialOrdenado.length === 0 ? (
              <div className="text-center py-4">
                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                <p className="text-muted">No hay servicios registrados</p>
              </div>
            ) : (
              <div className="historial-servicios">
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Descripción</th>
                      <th>Kilometraje</th>
                      <th>Costo</th>
                      <th>Realizado Por</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialOrdenado.map((servicio, index) => (
                      <tr key={servicio._id || index}>
                        <td>
                          <Badge bg="primary">
                            {formatearFecha(servicio.fecha)}
                          </Badge>
                        </td>
                        <td>{servicio.descripcion || 'Sin descripción'}</td>
                        <td>
                          {servicio.kilometraje 
                            ? `${servicio.kilometraje.toLocaleString()} km` 
                            : 'N/A'}
                        </td>
                        <td>{formatearMoneda(servicio.costo)}</td>
                        <td>{servicio.realizadoPor || 'N/A'}</td>
                        <td>
                          {servicio._id && (
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleEliminar(servicio._id!)}
                              title="Eliminar servicio"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          )}
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
        </>
      )}
    </Modal>
  );
};

export default ServicioModal;
