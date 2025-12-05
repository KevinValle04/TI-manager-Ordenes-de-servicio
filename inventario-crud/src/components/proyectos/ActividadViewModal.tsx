import React, { useState, useRef } from 'react';
import { Modal, Button, Badge, Tabs, Tab, Form } from 'react-bootstrap';
import { Actividad, Colaborador, EvidenciaActividad } from '../../types';
import './ActividadViewModal.css';

interface ActividadViewModalProps {
  show: boolean;
  onHide: () => void;
  actividad: Actividad | null;
  colaboradores: Colaborador[];
  onEdit: (actividad: Actividad) => void;
  onDelete: (id: string) => void;
  onUpdateEvidencias: (evidencias: EvidenciaActividad[]) => void;
}

const ActividadViewModal: React.FC<ActividadViewModalProps> = ({
  show,
  onHide,
  actividad,
  colaboradores,
  onEdit,
  onDelete,
  onUpdateEvidencias
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('detalles');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!actividad) return null;

  const getEstadoBadgeClass = (estado: string) => {
    switch (estado) {
      case 'Completada': return 'success';
      case 'En progreso': return 'primary';
      case 'Pendiente': return 'warning';
      case 'Cancelada': return 'danger';
      default: return 'secondary';
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getColaboradorNombres = () => {
    if (!actividad.colaboradores || actividad.colaboradores.length === 0) {
      return 'Sin asignar';
    }

    return actividad.colaboradores.map(c => {
      if (typeof c === 'string') {
        const colab = colaboradores.find(col => col._id === c);
        return colab ? colab.nombre : 'N/A';
      }
      return c.nombre;
    }).join(', ');
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona solo archivos de imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('evidencia', file);

      const response = await fetch(`/api/actividades/${actividad._id}/evidencias`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir la imagen');
      }

      const data = await response.json();
      
      // Agregar la nueva evidencia al array actual
      const nuevasEvidencias = [...(actividad.evidencias || []), data.evidencia];
      onUpdateEvidencias(nuevasEvidencias);
      
      alert('Evidencia subida exitosamente');
    } catch (error) {
      console.error('Error al subir imagen:', error);
      alert('Error al subir la imagen. Por favor intenta de nuevo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteEvidencia = async (evidenciaId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta evidencia?')) return;

    try {
      const response = await fetch(`/api/actividades/${actividad._id}/evidencias/${evidenciaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la evidencia');
      }

      // Filtrar la evidencia eliminada del array local
      const nuevasEvidencias = (actividad.evidencias || []).filter(e => e._id !== evidenciaId);
      onUpdateEvidencias(nuevasEvidencias);
      
      alert('Evidencia eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar evidencia:', error);
      alert('Error al eliminar la evidencia. Por favor intenta de nuevo.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" fullscreen="md-down" className="actividad-view-modal">
        <Modal.Header closeButton style={{ borderLeftColor: actividad.color || '#6c757d' }}>
          <Modal.Title className="d-flex align-items-center gap-2 flex-wrap">
            <Badge bg={getEstadoBadgeClass(actividad.estado)}>
              {actividad.estado}
            </Badge>
            <span>Actividad</span>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'detalles')} className="mb-3">
            {/* Tab de Detalles */}
            <Tab eventKey="detalles" title={<><i className="fas fa-info-circle me-2"></i>Detalles</>}>
              <div className="actividad-view-content">
                <div className="actividad-view-section">
                  <h6 className="section-title">
                    <i className="fas fa-align-left me-2"></i>
                    Descripción
                  </h6>
                  <p className="actividad-descripcion-text">{actividad.descripcion}</p>
                </div>

                <div className="actividad-view-section">
                  <h6 className="section-title">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Fechas
                  </h6>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="info-card">
                        <div className="info-label">Fecha de Inicio</div>
                        <div className="info-value">{formatDate(actividad.fechaInicio)}</div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="info-card">
                        <div className="info-label">Fecha de Finalización</div>
                        <div className="info-value">{formatDate(actividad.fechaFinal)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="actividad-view-section">
                  <h6 className="section-title">
                    <i className="fas fa-users me-2"></i>
                    Empleados Asignados
                  </h6>
                  <div className="info-card">
                    <div className="info-value">{getColaboradorNombres()}</div>
                  </div>
                </div>

                <div className="actividad-view-section">
                  <h6 className="section-title">
                    <i className="fas fa-palette me-2"></i>
                    Color de Identificación
                  </h6>
                  <div className="color-preview" style={{ backgroundColor: actividad.color || '#6c757d' }}>
                    <span>{actividad.color || '#6c757d'}</span>
                  </div>
                </div>
              </div>
            </Tab>

            {/* Tab de Evidencias */}
            <Tab 
              eventKey="evidencias" 
              title={
                <>
                  <i className="fas fa-images me-2"></i>
                  Evidencias 
                  {actividad.evidencias && actividad.evidencias.length > 0 && (
                    <Badge bg="primary" className="ms-2">{actividad.evidencias.length}</Badge>
                  )}
                </>
              }
            >
              <div className="evidencias-container">
                {/* Botón para subir nueva evidencia */}
                <div className="evidencias-upload-section">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    capture="environment"
                    style={{ display: 'none' }}
                  />
                  
                  <div className="d-flex gap-2 flex-wrap justify-content-center">
                    <Button
                      variant="primary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="btn-upload-evidencia"
                    >
                      {uploadingImage ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-cloud-upload-alt me-2"></i>
                          Subir Imagen
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="success"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="btn-camera-evidencia"
                    >
                      <i className="fas fa-camera me-2"></i>
                      Tomar Foto
                    </Button>
                  </div>
                  
                  <small className="text-muted d-block mt-2 text-center">
                    Formatos aceptados: JPG, PNG, GIF. Tamaño máximo: 5MB
                  </small>
                </div>

                {/* Lista de evidencias */}
                {!actividad.evidencias || actividad.evidencias.length === 0 ? (
                  <div className="evidencias-empty">
                    <i className="fas fa-image fa-3x mb-3"></i>
                    <h5>No hay evidencias</h5>
                    <p className="text-muted">Sube imágenes para documentar esta actividad</p>
                  </div>
                ) : (
                  <div className="evidencias-grid">
                    {actividad.evidencias.map((evidencia) => (
                      <div key={evidencia._id} className="evidencia-card">
                        <div 
                          className="evidencia-image"
                          onClick={() => setSelectedImage(evidencia.url)}
                          style={{ cursor: 'pointer' }}
                        >
                          <img src={evidencia.url} alt={evidencia.nombre} />
                          <div className="evidencia-overlay">
                            <i className="fas fa-search-plus"></i>
                          </div>
                        </div>
                        <div className="evidencia-info">
                          <div className="evidencia-nombre" title={evidencia.nombre}>
                            {evidencia.nombre}
                          </div>
                          <div className="evidencia-meta">
                            <small className="text-muted">
                              {formatFileSize(evidencia.tamaño)} • {new Date(evidencia.fechaSubida).toLocaleDateString('es-MX')}
                            </small>
                          </div>
                          <div className="d-flex gap-1 mt-2">
                            <Button
                              variant="info"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = evidencia.url;
                                link.download = evidencia.nombre;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className="btn-download-evidencia flex-fill"
                              title="Descargar imagen"
                            >
                              ⬇
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteEvidencia(evidencia._id!)}
                              className="btn-delete-evidencia flex-fill"
                              title="Eliminar imagen"
                            >
                              ✕
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cerrar
          </Button>
          <Button variant="warning" onClick={() => {
            onEdit(actividad);
            onHide();
          }}>
            <i className="fas fa-edit me-2"></i>
            Editar
          </Button>
          <Button variant="danger" onClick={() => {
            if (window.confirm('¿Estás seguro de eliminar esta actividad?')) {
              onDelete(actividad._id!);
              onHide();
            }
          }}>
            <i className="fas fa-trash me-2"></i>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de imagen ampliada */}
      <Modal show={!!selectedImage} onHide={() => setSelectedImage(null)} size="xl" centered>
        <Modal.Body className="p-0">
          <div className="image-viewer">
            <Button 
              variant="light" 
              className="btn-close-viewer"
              onClick={() => setSelectedImage(null)}
            >
              <i className="fas fa-times"></i>
            </Button>
            {selectedImage && (
              <img src={selectedImage} alt="Evidencia ampliada" className="img-fluid" />
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ActividadViewModal;
