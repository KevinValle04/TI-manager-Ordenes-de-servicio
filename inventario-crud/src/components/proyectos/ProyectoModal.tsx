import React, { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { Colaborador, Proyecto } from '../../types';

interface ProyectoModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<Proyecto>) => void;
  editingProyecto: Proyecto | null;
  colaboradores: Colaborador[];
}

const ProyectoModal: React.FC<ProyectoModalProps> = ({
  show,
  onHide,
  onSave,
  editingProyecto,
  colaboradores
}) => {
  const [formData, setFormData] = useState<Partial<Proyecto>>({
    nombre: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaTerminacion: '',
    colaboradores: [],
    estado: 'En progreso',
    descripcion: ''
  });

  useEffect(() => {
    if (editingProyecto) {
      setFormData({
        ...editingProyecto,
        fechaInicio: editingProyecto.fechaInicio 
          ? new Date(editingProyecto.fechaInicio).toISOString().split('T')[0] 
          : '',
        fechaTerminacion: editingProyecto.fechaTerminacion 
          ? new Date(editingProyecto.fechaTerminacion).toISOString().split('T')[0] 
          : '',
        colaboradores: Array.isArray(editingProyecto.colaboradores) 
          ? editingProyecto.colaboradores.map(c => typeof c === 'string' ? c : c._id || '')
          : []
      });
    } else {
      setFormData({
        nombre: '',
        fechaInicio: new Date().toISOString().split('T')[0],
        fechaTerminacion: '',
        colaboradores: [],
        estado: 'En progreso',
        descripcion: ''
      });
    }
  }, [editingProyecto, show]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColaboradorChange = (colaboradorId: string) => {
    setFormData(prev => {
      const currentColaboradores = Array.isArray(prev.colaboradores) ? prev.colaboradores as string[] : [];
      const isSelected = currentColaboradores.includes(colaboradorId);
      
      return {
        ...prev,
        colaboradores: isSelected
          ? currentColaboradores.filter(id => id !== colaboradorId)
          : [...currentColaboradores, colaboradorId]
      };
    });
  };

  const isColaboradorSelected = (colaboradorId: string): boolean => {
    const currentColaboradores = Array.isArray(formData.colaboradores) ? formData.colaboradores as string[] : [];
    return currentColaboradores.includes(colaboradorId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre || formData.nombre.trim() === '') {
      alert('El nombre del proyecto es requerido');
      return;
    }

    if (!formData.fechaInicio || !formData.fechaTerminacion) {
      alert('Las fechas de inicio y terminación son requeridas');
      return;
    }

    if (new Date(formData.fechaInicio) > new Date(formData.fechaTerminacion)) {
      alert('La fecha de inicio no puede ser posterior a la fecha de terminación');
      return;
    }

    onSave(formData);
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaTerminacion: '',
      colaboradores: [],
      estado: 'En progreso',
      descripcion: ''
    });
    onHide();
  };

  // Filtrar colaboradores activos
  const colaboradoresActivos = colaboradores.filter(c => c.activo);

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered fullscreen="md-down">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <i className="fas fa-project-diagram me-2"></i>
          {editingProyecto ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4 py-3">
        <Form onSubmit={handleSubmit}>
          <div className="row">
            <div className="col-md-12 mb-3">
              <Form.Group>
                <Form.Label>
                  Nombre del Proyecto <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="nombre"
                  value={formData.nombre || ''}
                  onChange={handleChange}
                  placeholder="Ej: Instalación de cámaras sede norte"
                  required
                />
              </Form.Group>
            </div>

            <div className="col-md-6 col-12 mb-3">
              <Form.Group>
                <Form.Label>
                  Fecha de Inicio <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="fechaInicio"
                  value={formData.fechaInicio as string || ''}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>

            <div className="col-md-6 col-12 mb-3">
              <Form.Group>
                <Form.Label>
                  Fecha de Terminación <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="date"
                  name="fechaTerminacion"
                  value={formData.fechaTerminacion as string || ''}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </div>

            <div className="col-md-12 mb-3">
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  name="estado"
                  value={formData.estado || 'En progreso'}
                  onChange={handleChange}
                >
                  <option value="En progreso">En progreso</option>
                  <option value="Completado">Completado</option>
                  <option value="Pausado">Pausado</option>
                  <option value="Cancelado">Cancelado</option>
                </Form.Select>
              </Form.Group>
            </div>

            <div className="col-md-12 mb-3">
              <Form.Group>
                <Form.Label>
                  Empleados Participantes
                </Form.Label>
                <div 
                  className="border rounded p-3" 
                  style={{ 
                    maxHeight: '250px', 
                    overflowY: 'auto',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  {colaboradoresActivos.length === 0 ? (
                    <div className="text-muted text-center py-3">
                      <i className="fas fa-users me-2"></i>
                      No hay empleados activos disponibles
                    </div>
                  ) : (
                    <div className="row">
                      {colaboradoresActivos.map(colaborador => (
                        <div key={colaborador._id} className="col-md-6 col-12 mb-2">
                          <Form.Check
                            type="checkbox"
                            id={`colaborador-${colaborador._id}`}
                            label={
                              <span>
                                <strong>{colaborador.numeroEmpleado}</strong> - {colaborador.nombre}
                                <br />
                                <small className="text-muted">{colaborador.puesto}</small>
                              </span>
                            }
                            checked={isColaboradorSelected(colaborador._id || '')}
                            onChange={() => handleColaboradorChange(colaborador._id || '')}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {formData.colaboradores && (formData.colaboradores as string[]).length > 0 && (
                  <small className="text-muted mt-2 d-block">
                    <i className="fas fa-check-circle text-success me-1"></i>
                    {(formData.colaboradores as string[]).length} empleado(s) seleccionado(s)
                  </small>
                )}
              </Form.Group>
            </div>

            <div className="col-md-12 mb-3">
              <Form.Group>
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="descripcion"
                  value={formData.descripcion || ''}
                  onChange={handleChange}
                  placeholder="Descripción del proyecto, objetivos, alcance..."
                />
              </Form.Group>
            </div>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          <i className="fas fa-save me-2"></i>
          {editingProyecto ? 'Actualizar' : 'Guardar'} Proyecto
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProyectoModal;
