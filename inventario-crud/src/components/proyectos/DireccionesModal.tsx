import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, InputGroup } from 'react-bootstrap';
import { DireccionIP, Proyecto } from '../../types';
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash } from 'react-icons/fa';

interface DireccionesModalProps {
  show: boolean;
  onHide: () => void;
  proyecto: Proyecto | null;
}

const DireccionesModal: React.FC<DireccionesModalProps> = ({ show, onHide, proyecto }) => {
  const [direcciones, setDirecciones] = useState<DireccionIP[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingDireccion, setEditingDireccion] = useState<DireccionIP | null>(null);
  const [showPasswords, setShowPasswords] = useState<{[key: string]: boolean}>({});

  const [formData, setFormData] = useState({
    equipo: '',
    usuario: '',
    contrasena: '',
    direccion: '',
    esRango: false,
    direccionFin: ''
  });

  useEffect(() => {
    if (show && proyecto) {
      fetchDirecciones();
    }
  }, [show, proyecto]);

  useEffect(() => {
    if (!showForm) {
      resetForm();
    }
  }, [showForm]);

  const fetchDirecciones = async () => {
    if (!proyecto?._id) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/proyectos/${proyecto._id}/direcciones`);
      if (!response.ok) throw new Error('Error al cargar direcciones');
      const data = await response.json();
      setDirecciones(data);
    } catch (error) {
      console.error('Error al cargar direcciones:', error);
      alert('Error al cargar las direcciones IP');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      equipo: '',
      usuario: '',
      contrasena: '',
      direccion: '',
      esRango: false,
      direccionFin: ''
    });
    setEditingDireccion(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEdit = (direccion: DireccionIP) => {
    setEditingDireccion(direccion);
    setFormData({
      equipo: direccion.equipo,
      usuario: direccion.usuario,
      contrasena: direccion.contrasena,
      direccion: direccion.direccion,
      esRango: direccion.esRango,
      direccionFin: direccion.direccionFin || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta dirección?')) return;

    try {
      const response = await fetch(`/api/proyectos/direcciones/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar dirección');
      
      fetchDirecciones();
      alert('Dirección eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar dirección:', error);
      alert('Error al eliminar la dirección');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!proyecto?._id) return;

    if (!formData.equipo || !formData.usuario || !formData.contrasena || !formData.direccion) {
      alert('Todos los campos son requeridos');
      return;
    }

    if (formData.esRango && !formData.direccionFin) {
      alert('Debe especificar la dirección final del rango');
      return;
    }

    try {
      const url = editingDireccion
        ? `/api/proyectos/direcciones/${editingDireccion._id}`
        : `/api/proyectos/${proyecto._id}/direcciones`;

      const response = await fetch(url, {
        method: editingDireccion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al guardar dirección');
      }

      fetchDirecciones();
      setShowForm(false);
      resetForm();
      alert(editingDireccion ? 'Dirección actualizada' : 'Dirección creada exitosamente');
    } catch (error: any) {
      console.error('Error al guardar dirección:', error);
      alert(error.message || 'Error al guardar la dirección');
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatDireccion = (direccion: DireccionIP) => {
    if (direccion.esRango && direccion.direccionFin) {
      return `${direccion.direccion} - ${direccion.direccionFin}`;
    }
    return direccion.direccion;
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="fas fa-network-wired me-2"></i>
          Direcciones IP - {proyecto?.nombre}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!showForm ? (
          <>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5>Listado de Direcciones</h5>
              <div className="d-flex gap-2">
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={() => window.open(`/api/proyectos/${proyecto?._id}/direcciones/pdf`, '_blank')}                  disabled={direcciones.length === 0}
                  title="Descargar listado en PDF"
                >
                  <i className="fas fa-file-pdf me-2"></i>
                  Descargar PDF
                </Button>
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowForm(true)}
                >
                  <FaPlus className="me-2" />
                  Nueva Dirección
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : direcciones.length === 0 ? (
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                No hay direcciones IP registradas para este proyecto
              </div>
            ) : (
              <div className="table-responsive">
                <Table striped bordered hover>
                  <thead className="table-dark">
                    <tr>
                      <th>Equipo</th>
                      <th>Usuario</th>
                      <th>Contraseña</th>
                      <th>Dirección IP</th>
                      <th style={{ width: '120px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {direcciones.map((direccion) => (
                      <tr key={direccion._id}>
                        <td>{direccion.equipo}</td>
                        <td>{direccion.usuario}</td>
                        <td>
                          <InputGroup size="sm">
                            <Form.Control
                              type={showPasswords[direccion._id!] ? 'text' : 'password'}
                              value={direccion.contrasena}
                              readOnly
                              style={{ maxWidth: '200px' }}
                            />
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => togglePasswordVisibility(direccion._id!)}
                            >
                              {showPasswords[direccion._id!] ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </InputGroup>
                        </td>
                        <td>
                          {formatDireccion(direccion)}
                          {direccion.esRango && (
                            <span className="badge bg-info ms-2">Rango</span>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(direccion)}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(direccion._id!)}
                          >
                            <FaTrash />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </>
        ) : (
          <Form onSubmit={handleSubmit}>
            <h5 className="mb-3">
              {editingDireccion ? 'Editar Dirección' : 'Nueva Dirección'}
            </h5>

            <Form.Group className="mb-3">
              <Form.Label>Equipo *</Form.Label>
              <Form.Control
                type="text"
                name="equipo"
                value={formData.equipo}
                onChange={handleInputChange}
                placeholder="Ej: Router Principal, Switch 1, Server..."
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Usuario *</Form.Label>
              <Form.Control
                type="text"
                name="usuario"
                value={formData.usuario}
                onChange={handleInputChange}
                placeholder="Usuario de acceso"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contraseña *</Form.Label>
              <Form.Control
                type="text"
                name="contrasena"
                value={formData.contrasena}
                onChange={handleInputChange}
                placeholder="Contraseña"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Dirección IP {formData.esRango ? 'Inicial' : ''} *</Form.Label>
              <Form.Control
                type="text"
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                placeholder="Ej: 192.168.1.1"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="esRango"
                checked={formData.esRango}
                onChange={handleInputChange}
                label="Es un rango de direcciones IP"
              />
            </Form.Group>

            {formData.esRango && (
              <Form.Group className="mb-3">
                <Form.Label>Dirección IP Final *</Form.Label>
                <Form.Control
                  type="text"
                  name="direccionFin"
                  value={formData.direccionFin}
                  onChange={handleInputChange}
                  placeholder="Ej: 192.168.1.254"
                  required={formData.esRango}
                />
                <Form.Text className="text-muted">
                  Especifique la última IP del rango
                </Form.Text>
              </Form.Group>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                {editingDireccion ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DireccionesModal;