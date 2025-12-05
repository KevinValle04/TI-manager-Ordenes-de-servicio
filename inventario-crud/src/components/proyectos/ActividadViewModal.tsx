import React, { useState, useRef } from 'react';
import { Modal, Button, Badge, Tabs, Tab, Form } from 'react-bootstrap';
import { Actividad, Colaborador, EvidenciaActividad, NotaActividad } from '../../types';
import './ActividadViewModal.css';

interface ActividadViewModalProps {
  show: boolean;
  onHide: () => void;
  actividad: Actividad | null;
  colaboradores: Colaborador[];
  onEdit: (actividad: Actividad) => void;
  onDelete: (id: string) => void;
  onUpdateEvidencias: (evidencias: EvidenciaActividad[]) => void;
  onUpdateNotas: (notas: NotaActividad[]) => void;
}

const ActividadViewModal: React.FC<ActividadViewModalProps> = ({
  show,
  onHide,
  actividad,
  colaboradores,
  onEdit,
  onDelete,
  onUpdateEvidencias,
  onUpdateNotas
}) => {
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('detalles');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [nuevaNota, setNuevaNota] = useState('');
  const [guardandoNota, setGuardandoNota] = useState(false);
  const [editandoNotaId, setEditandoNotaId] = useState<string | null>(null);
  const [textoEditandoNota, setTextoEditandoNota] = useState('');
  const [archivoTemp, setArchivoTemp] = useState<File | null>(null);
  const [mostrarModalRenombrar, setMostrarModalRenombrar] = useState(false);
  const [nombreImagen, setNombreImagen] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handlePrevImage = React.useCallback(() => {
    if (selectedImageIndex === null || !actividad?.evidencias) return;
    const newIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : actividad.evidencias.length - 1;
    setSelectedImageIndex(newIndex);
  }, [selectedImageIndex, actividad?.evidencias]);

  const handleNextImage = React.useCallback(() => {
    if (selectedImageIndex === null || !actividad?.evidencias) return;
    const newIndex = selectedImageIndex < actividad.evidencias.length - 1 ? selectedImageIndex + 1 : 0;
    setSelectedImageIndex(newIndex);
  }, [selectedImageIndex, actividad?.evidencias]);

  const handleKeyDown = React.useCallback((e: KeyboardEvent) => {
    if (selectedImageIndex === null) return;
    if (e.key === 'ArrowLeft') {
      handlePrevImage();
    } else if (e.key === 'ArrowRight') {
      handleNextImage();
    } else if (e.key === 'Escape') {
      setSelectedImageIndex(null);
    }
  }, [selectedImageIndex, handlePrevImage, handleNextImage]);

  React.useEffect(() => {
    if (selectedImageIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedImageIndex, handleKeyDown]);

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

    // Guardar archivo y mostrar modal para renombrar
    setArchivoTemp(file);
    // Extraer nombre sin extensión
    const nombreSinExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setNombreImagen(nombreSinExt);
    setMostrarModalRenombrar(true);
  };

  const handleConfirmarSubida = async () => {
    if (!archivoTemp) return;

    if (!nombreImagen.trim()) {
      alert('Por favor ingresa un nombre para la imagen');
      return;
    }

    setUploadingImage(true);
    setMostrarModalRenombrar(false);

    try {
      // Obtener la extensión del archivo original
      const extension = archivoTemp.name.substring(archivoTemp.name.lastIndexOf('.'));
      const nuevoNombre = nombreImagen.trim() + extension;
      
      // Crear un nuevo archivo con el nombre personalizado
      const archivoRenombrado = new File([archivoTemp], nuevoNombre, { type: archivoTemp.type });
      
      const formData = new FormData();
      formData.append('evidencia', archivoRenombrado);

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
      setArchivoTemp(null);
      setNombreImagen('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const handleCancelarSubida = () => {
    setMostrarModalRenombrar(false);
    setArchivoTemp(null);
    setNombreImagen('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
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

  const handleAgregarNota = async () => {
    if (!nuevaNota.trim()) {
      alert('Por favor escribe una nota');
      return;
    }

    setGuardandoNota(true);

    try {
      // Obtener el nombre de usuario del localStorage
      const userInfo = localStorage.getItem('userInfo');
      let username = 'Usuario';
      if (userInfo) {
        try {
          const parsed = JSON.parse(userInfo);
          username = parsed.username || 'Usuario';
        } catch (e) {
          console.error('Error parsing userInfo:', e);
        }
      }

      const response = await fetch(`/api/actividades/${actividad._id}/notas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texto: nuevaNota.trim(),
          creadoPor: username
        }),
      });

      if (!response.ok) {
        throw new Error('Error al agregar la nota');
      }

      const data = await response.json();
      
      // Agregar la nueva nota al array actual
      const nuevasNotas = [...(actividad.notas || []), data.nota];
      onUpdateNotas(nuevasNotas);
      
      setNuevaNota('');
      alert('Nota agregada exitosamente');
    } catch (error) {
      console.error('Error al agregar nota:', error);
      alert('Error al agregar la nota. Por favor intenta de nuevo.');
    } finally {
      setGuardandoNota(false);
    }
  };

  const handleEliminarNota = async (notaId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta nota?')) return;

    try {
      const response = await fetch(`/api/actividades/${actividad._id}/notas/${notaId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar la nota');
      }

      // Filtrar la nota eliminada del array local
      const nuevasNotas = (actividad.notas || []).filter(n => n._id !== notaId);
      onUpdateNotas(nuevasNotas);
      
      alert('Nota eliminada exitosamente');
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      alert('Error al eliminar la nota. Por favor intenta de nuevo.');
    }
  };

  const handleIniciarEdicion = (nota: NotaActividad) => {
    setEditandoNotaId(nota._id!);
    setTextoEditandoNota(nota.texto);
  };

  const handleCancelarEdicion = () => {
    setEditandoNotaId(null);
    setTextoEditandoNota('');
  };

  const handleActualizarNota = async (notaId: string) => {
    if (!textoEditandoNota.trim()) {
      alert('El texto de la nota no puede estar vacío');
      return;
    }

    try {
      const response = await fetch(`/api/actividades/${actividad._id}/notas/${notaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texto: textoEditandoNota.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar la nota');
      }

      const data = await response.json();
      
      // Actualizar la nota en el array local
      const nuevasNotas = (actividad.notas || []).map(n => 
        n._id === notaId ? { ...n, texto: data.nota.texto } : n
      );
      onUpdateNotas(nuevasNotas);
      
      setEditandoNotaId(null);
      setTextoEditandoNota('');
      alert('Nota actualizada exitosamente');
    } catch (error) {
      console.error('Error al actualizar nota:', error);
      alert('Error al actualizar la nota. Por favor intenta de nuevo.');
    }
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
                          onClick={() => {
                            const index = actividad.evidencias!.findIndex(e => e._id === evidencia._id);
                            setSelectedImageIndex(index);
                          }}
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
                              ↓
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

            {/* Tab de Notas */}
            <Tab 
              eventKey="notas" 
              title={
                <>
                  <i className="fas fa-sticky-note me-2"></i>
                  Notas
                  {actividad.notas && actividad.notas.length > 0 && (
                    <Badge bg="info" className="ms-2">{actividad.notas.length}</Badge>
                  )}
                </>
              }
            >
              <div className="notas-container">
                {/* Formulario para agregar nueva nota */}
                <div className="notas-form-section">
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <i className="fas fa-pencil-alt me-2"></i>
                      Nueva Nota
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      placeholder="Escribe una nota aquí..."
                      value={nuevaNota}
                      onChange={(e) => setNuevaNota(e.target.value)}
                      disabled={guardandoNota}
                    />
                  </Form.Group>
                  
                  <Button
                    variant="primary"
                    onClick={handleAgregarNota}
                    disabled={guardandoNota || !nuevaNota.trim()}
                    className="w-100"
                  >
                    {guardandoNota ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-plus me-2"></i>
                        Agregar Nota
                      </>
                    )}
                  </Button>
                </div>

                {/* Lista de notas */}
                {!actividad.notas || actividad.notas.length === 0 ? (
                  <div className="notas-empty">
                    <i className="fas fa-sticky-note fa-3x mb-3"></i>
                    <h5>No hay notas</h5>
                    <p className="text-muted">Agrega notas para capturar información importante</p>
                  </div>
                ) : (
                  <div className="notas-list">
                    {actividad.notas.map((nota) => (
                      <div key={nota._id} className="nota-card">
                        <div className="nota-header">
                          <small className="text-muted">
                            <i className="fas fa-clock me-1"></i>
                            {new Date(nota.fechaCreacion).toLocaleString('es-MX', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                            {nota.creadoPor && ` • ${nota.creadoPor}`}
                          </small>
                          <div className="nota-actions">
                            {editandoNotaId !== nota._id && (
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleIniciarEdicion(nota)}
                                className="btn-edit-nota"
                                title="Editar nota"
                              >
                                <i className="fas fa-edit"></i>
                              </Button>
                            )}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleEliminarNota(nota._id!)}
                              className="btn-delete-nota"
                              title="Eliminar nota"
                            >
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </div>
                        {editandoNotaId === nota._id ? (
                          <div className="nota-edit-form">
                            <Form.Control
                              as="textarea"
                              rows={3}
                              value={textoEditandoNota}
                              onChange={(e) => setTextoEditandoNota(e.target.value)}
                              autoFocus
                            />
                            <div className="d-flex gap-2 mt-2">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleActualizarNota(nota._id!)}
                                className="flex-fill"
                              >
                                <i className="fas fa-check me-1"></i>
                                Guardar
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={handleCancelarEdicion}
                                className="flex-fill"
                              >
                                <i className="fas fa-times me-1"></i>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="nota-texto">
                            {nota.texto}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>

        <Modal.Footer>
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

      {/* Modal de imagen ampliada con navegación */}
      <Modal 
        show={selectedImageIndex !== null} 
        onHide={() => setSelectedImageIndex(null)} 
        size="xl" 
        centered
        className="image-viewer-modal"
      >
        <Modal.Body className="p-0">
          <div className="image-viewer">
            <div className="viewer-controls">
              <Button 
                variant="light" 
                className="btn-download-viewer"
                onClick={() => {
                  if (selectedImageIndex !== null && actividad.evidencias) {
                    const evidencia = actividad.evidencias[selectedImageIndex];
                    const link = document.createElement('a');
                    link.href = evidencia.url;
                    link.download = evidencia.nombre;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                title="Descargar imagen"
              >
                ↓
              </Button>
              <Button 
                variant="light" 
                className="btn-close-viewer"
                onClick={() => setSelectedImageIndex(null)}
                title="Cerrar"
              >
                ✕
              </Button>
            </div>
            
            {selectedImageIndex !== null && actividad.evidencias && actividad.evidencias.length > 1 && (
              <>
                <Button
                  variant="light"
                  className="btn-nav-viewer btn-prev-viewer"
                  onClick={handlePrevImage}
                >
                  ‹
                </Button>
                <Button
                  variant="light"
                  className="btn-nav-viewer btn-next-viewer"
                  onClick={handleNextImage}
                >
                  ›
                </Button>
              </>
            )}
            
            {selectedImageIndex !== null && actividad.evidencias && (
              <div className="image-viewer-content">
                <img 
                  src={actividad.evidencias[selectedImageIndex].url} 
                  alt={actividad.evidencias[selectedImageIndex].nombre}
                  className="img-fluid" 
                />
                <div className="image-viewer-info">
                  <span className="image-counter">
                    {selectedImageIndex + 1} / {actividad.evidencias.length}
                  </span>
                  <span className="image-name">
                    {actividad.evidencias[selectedImageIndex].nombre}
                  </span>
                </div>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>

      {/* Modal para renombrar imagen antes de subir */}
      <Modal 
        show={mostrarModalRenombrar} 
        onHide={handleCancelarSubida}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-edit me-2"></i>
            Renombrar Imagen
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Nombre de la imagen:</Form.Label>
            <Form.Control
              type="text"
              value={nombreImagen}
              onChange={(e) => setNombreImagen(e.target.value)}
              placeholder="Ingresa el nombre de la imagen"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmarSubida();
                }
              }}
            />
            <Form.Text className="text-muted">
              {archivoTemp && `Extensión: ${archivoTemp.name.substring(archivoTemp.name.lastIndexOf('.'))}`}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelarSubida}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleConfirmarSubida}
            disabled={!nombreImagen.trim()}
          >
            <i className="fas fa-upload me-2"></i>
            Subir Imagen
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ActividadViewModal;
