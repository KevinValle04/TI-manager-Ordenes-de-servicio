import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { Vehiculo } from '../../types';

interface VehiculoFormModalProps {
  show: boolean;
  onHide: () => void;
  vehiculo?: Vehiculo | null;
  onSave: (vehiculo: Partial<Vehiculo>) => Promise<void>;
}

const VehiculoFormModal: React.FC<VehiculoFormModalProps> = ({
  show,
  onHide,
  vehiculo,
  onSave
}) => {
  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    color: '',
    placas: '',
    numeroSerie: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (vehiculo) {
      setFormData({
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        año: vehiculo.año,
        color: vehiculo.color,
        placas: vehiculo.placas || '',
        numeroSerie: vehiculo.numeroSerie || ''
      });
    } else {
      setFormData({
        marca: '',
        modelo: '',
        año: new Date().getFullYear(),
        color: '',
        placas: '',
        numeroSerie: ''
      });
    }
    setErrors({});
  }, [vehiculo, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'año' ? parseInt(value) || new Date().getFullYear() : value
    }));
    
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.marca.trim()) {
      newErrors.marca = 'La marca es requerida';
    }

    if (!formData.modelo.trim()) {
      newErrors.modelo = 'El modelo es requerido';
    }

    if (!formData.año || formData.año < 1900 || formData.año > new Date().getFullYear() + 1) {
      newErrors.año = 'El año debe estar entre 1900 y ' + (new Date().getFullYear() + 1);
    }

    if (!formData.color.trim()) {
      newErrors.color = 'El color es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onHide();
    } catch (error) {
      console.error('Error al guardar vehículo:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-car me-2"></i>
          {vehiculo ? 'Editar Vehículo' : 'Agregar Vehículo'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Marca <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  isInvalid={!!errors.marca}
                  placeholder="Ej: Toyota, Ford, Nissan"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.marca}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Modelo <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  isInvalid={!!errors.modelo}
                  placeholder="Ej: Hilux, Ranger, Frontier"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.modelo}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Año <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="number"
                  name="año"
                  value={formData.año}
                  onChange={handleChange}
                  isInvalid={!!errors.año}
                  min={1900}
                  max={new Date().getFullYear() + 1}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.año}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>
                  Color <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  isInvalid={!!errors.color}
                  placeholder="Ej: Blanco, Negro, Rojo"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.color}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Placas</Form.Label>
                <Form.Control
                  type="text"
                  name="placas"
                  value={formData.placas}
                  onChange={handleChange}
                  placeholder="Ej: ABC-123-D"
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group>
                <Form.Label>Número de Serie</Form.Label>
                <Form.Control
                  type="text"
                  name="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={handleChange}
                  placeholder="Ej: 1HGBH41JXMN109186"
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            Los campos marcados con <span className="text-danger">*</span> son obligatorios.
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save me-2"></i>
                Guardar
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default VehiculoFormModal;
