import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { Actividad, Colaborador } from '../../types';

interface ActividadModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<Actividad>) => void;
  editingActividad: Actividad | null;
  colaboradores: Colaborador[];
}

const ActividadModal: React.FC<ActividadModalProps> = ({
  show,
  onHide,
  onSave,
  editingActividad,
  colaboradores
}) => {
  interface FormDataType {
    descripcion: string;
    fechaInicio: string;
    fechaFinal: string;
    estado: 'Pendiente' | 'En progreso' | 'Completada' | 'Cancelada';
    colaboradores: string[];
  }

  const [formData, setFormData] = useState<FormDataType>({
    descripcion: '',
    fechaInicio: '',
    fechaFinal: '',
    estado: 'Pendiente',
    colaboradores: []
  });

  useEffect(() => {
    if (editingActividad) {
      setFormData({
        descripcion: editingActividad.descripcion || '',
        fechaInicio: formatDateForInput(editingActividad.fechaInicio),
        fechaFinal: formatDateForInput(editingActividad.fechaFinal),
        estado: editingActividad.estado || 'Pendiente',
        colaboradores: Array.isArray(editingActividad.colaboradores)
          ? editingActividad.colaboradores.map(c => typeof c === 'string' ? c : c._id!)
          : []
      });
    } else {
      setFormData({
        descripcion: '',
        fechaInicio: '',
        fechaFinal: '',
        estado: 'Pendiente',
        colaboradores: []
      });
    }
  }, [editingActividad, show]);

  const formatDateForInput = (date: Date | string): string => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
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

    const fechaInicio = new Date(formData.fechaInicio);
    const fechaFinal = new Date(formData.fechaFinal);

    if (fechaFinal < fechaInicio) {
      alert('La fecha final debe ser posterior a la fecha de inicio');
      return;
    }

    const dataToSave: Partial<Actividad> = {
      ...formData,
      ...(editingActividad?._id && { _id: editingActividad._id })
    };

    onSave(dataToSave);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-tasks me-2"></i>
          {editingActividad ? 'Editar Actividad' : 'Nueva Actividad'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
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
            <div className="col-md-6">
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

            <div className="col-md-6">
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

          <Form.Group className="mb-3">
            <Form.Label>Colaboradores Implicados</Form.Label>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              border: '1px solid #ced4da', 
              borderRadius: '0.375rem',
              padding: '0.5rem'
            }}>
              {colaboradores.length === 0 ? (
                <div className="text-muted text-center py-2">
                  No hay colaboradores disponibles
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
