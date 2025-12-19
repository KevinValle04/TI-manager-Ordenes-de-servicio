import React, { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { Actividad, Colaborador } from '../../types';

interface ActividadModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<Actividad>) => void;
  editingActividad: Actividad | null;
  colaboradores: Colaborador[];
  actividades: Actividad[]; // Para validar números de actividad existentes
}

const ActividadModal: React.FC<ActividadModalProps> = ({
  show,
  onHide,
  onSave,
  editingActividad,
  colaboradores,
  actividades
}) => {
  // Colores predefinidos para las tarjetas
  const coloresPredefinidos = [
    { valor: '#0d6efd', nombre: 'Azul' },
    { valor: '#198754', nombre: 'Verde' },
    { valor: '#ffc107', nombre: 'Amarillo' },
    { valor: '#dc3545', nombre: 'Rojo' },
    { valor: '#6f42c1', nombre: 'Morado' },
    { valor: '#fd7e14', nombre: 'Naranja' },
    { valor: '#20c997', nombre: 'Turquesa' },
    { valor: '#d63384', nombre: 'Rosa' },
    { valor: '#6c757d', nombre: 'Gris' },
    { valor: '#0dcaf0', nombre: 'Cyan' }
  ];

  interface FormDataType {
    numeroActividad: string;
    descripcion: string;
    fechaInicio: string;
    fechaFinal: string;
    estado: 'Pendiente' | 'En progreso' | 'Completada' | 'Cancelada';
    colaboradores: string[];
    color: string;
  }

  const [formData, setFormData] = useState<FormDataType>({
    numeroActividad: '',
    descripcion: '',
    fechaInicio: '',
    fechaFinal: '',
    estado: 'Pendiente',
    colaboradores: [],
    color: '#0d6efd'
  });

  useEffect(() => {
    if (editingActividad) {
      setFormData({
        numeroActividad: editingActividad.numeroActividad || '',
        descripcion: editingActividad.descripcion || '',
        fechaInicio: formatDateForInput(editingActividad.fechaInicio),
        fechaFinal: formatDateForInput(editingActividad.fechaFinal),
        estado: editingActividad.estado || 'Pendiente',
        colaboradores: Array.isArray(editingActividad.colaboradores)
          ? editingActividad.colaboradores.map(c => typeof c === 'string' ? c : c._id!)
          : [],
        color: editingActividad.color || '#0d6efd'
      });
    } else {
      setFormData({
        numeroActividad: '',
        descripcion: '',
        fechaInicio: '',
        fechaFinal: '',
        estado: 'Pendiente',
        colaboradores: [],
        color: '#0d6efd'
      });
    }
  }, [editingActividad, show]);

  const formatDateForInput = (date: Date | string): string => {
    if (!date) return '';
    // Usar UTC para evitar problemas de zona horaria
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descripcion || formData.descripcion.trim() === '') {
      alert('La descripción es requerida');
      return;
    }

    if (!formData.fechaInicio || !formData.fechaFinal) {
      alert('Las fechas de inicio y final son requeridas');
      return;
    }

    // Validar que el número de actividad no esté duplicado
    if (formData.numeroActividad) {
      const numeroExistente = actividades.find(
        a => a.numeroActividad === formData.numeroActividad && a._id !== editingActividad?._id
      );
      if (numeroExistente) {
        alert(`El número de actividad "${formData.numeroActividad}" ya existe. Por favor, use otro número.`);
        return;
      }
    }

    // Crear fechas en UTC para evitar problemas de zona horaria
    // Agregar 'T12:00:00' para que al convertir a UTC no cambie el día
    const fechaInicio = new Date(formData.fechaInicio + 'T12:00:00');
    const fechaFinal = new Date(formData.fechaFinal + 'T12:00:00');

    if (fechaFinal < fechaInicio) {
      alert('La fecha final debe ser posterior a la fecha de inicio');
      return;
    }

    const dataToSave: Partial<Actividad> = {
      ...formData,
      fechaInicio: fechaInicio,
      fechaFinal: fechaFinal,
      ...(editingActividad?._id && { _id: editingActividad._id })
    };

    onSave(dataToSave);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" fullscreen="md-down">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-tasks me-2"></i>
          {editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {/* Número de Actividad - Solo visible al editar */}
          {editingActividad && (
            <Form.Group className="mb-3">
              <Form.Label>
                Número de Actividad
              </Form.Label>
              <div className="d-flex align-items-center" style={{ maxWidth: '150px' }}>
                <span className="input-group-text" style={{ borderRadius: '0.375rem 0 0 0.375rem' }}>ACT</span>
                <Form.Control
                  type="number"
                  min="0"
                  max="99"
                  name="numeroActividad"
                  value={formData.numeroActividad.replace('ACT', '')}
                  onChange={(e) => {
                    const num = e.target.value.replace(/\D/g, '');
                    const formatted = num ? `ACT${num.padStart(2, '0')}` : '';
                    setFormData(prev => ({ ...prev, numeroActividad: formatted }));
                  }}
                  placeholder="00"
                  style={{ borderRadius: '0 0.375rem 0.375rem 0' }}
                />
              </div>
              <Form.Text className="text-muted">
                Ingrese solo el número (ej: 1 → ACT01)
              </Form.Text>
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label>
              Descripción de la Actividad <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe la actividad..."
              required
            />
          </Form.Group>

          <div className="row">
            <div className="col-md-6 col-12 mb-3 mb-md-0">
              <Form.Group className="mb-3">
                <Form.Label>
                  Fecha de Inicio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="fechaInicio"
                  value={formData.fechaInicio}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>

            <div className="col-md-6 col-12">
              <Form.Group className="mb-3">
                <Form.Label>
                  Fecha Final <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="fechaFinal"
                  value={formData.fechaFinal}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8 col-12 mb-3 mb-md-0">
              <Form.Group className="mb-3">
                <Form.Label>Estado de la Actividad</Form.Label>
                <Form.Select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="En progreso">En progreso</option>
                  <option value="Completada">Completada</option>
                  <option value="Cancelada">Cancelada</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-4 col-12">
              <Form.Group className="mb-3">
                <Form.Label>Color de la Tarjeta</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {coloresPredefinidos.map((colorOption) => (
                    <div
                      key={colorOption.valor}
                      onClick={() => setFormData(prev => ({ ...prev, color: colorOption.valor }))}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: colorOption.valor,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        border: formData.color === colorOption.valor ? '3px solid #000' : '2px solid #dee2e6',
                        transition: 'all 0.2s ease',
                        boxShadow: formData.color === colorOption.valor ? '0 0 0 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                      title={colorOption.nombre}
                    />
                  ))}
                </div>
                <Form.Text className="text-muted">
                  Color del borde izquierdo
                </Form.Text>
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Empleados Implicados</Form.Label>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ced4da', 
              borderRadius: '0.375rem',
              padding: '0.5rem'
            }}>
              {colaboradores.length === 0 ? (
                <div className="text-muted text-center py-2">
                  No hay empleados disponibles
                </div>
              ) : (
                colaboradores.map(colab => (
                  <Form.Check
                    key={colab._id}
                    type="checkbox"
                    id={`colaborador-${colab._id}`}
                    label={`${colab.nombre} - ${colab.puesto}`}
                    checked={formData.colaboradores.includes(colab._id!)}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      const colaboradorId = colab._id!;
                      setFormData(prev => ({
                        ...prev,
                        colaboradores: isChecked
                          ? [...prev.colaboradores, colaboradorId]
                          : prev.colaboradores.filter(id => id !== colaboradorId)
                      }));
                    }}
                    className="mb-2"
                  />
                ))
              )}
            </div>
            <Form.Text className="text-muted">
              Selecciona los colaboradores que participarán en esta actividad
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            <i className="fas fa-save me-2"></i>
            {editingActividad ? 'Actualizar' : 'Crear'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ActividadModal;
