import axios from 'axios';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { Button, Col, Form, Image, Modal, Row } from 'react-bootstrap';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DataTable, { DataTableColumn } from '../common/DataTable';
import PaginationCompact from '../common/PaginationCompact';
import SearchBar from '../common/SearchBar';
import './Colaboradores.css';

interface RazonSocial {
  _id?: string;
  nombre: string;
}

interface ColaboradorBase {
  _id?: string;
  numeroEmpleado?: string;
  nombre: string;
  nss: string;
  puesto: string;
  fotografia?: string;
  fechaAltaIMSS: Date | string;
  activo: boolean;
}

interface ColaboradorCreate extends ColaboradorBase {
  razonSocialId: string;
}

interface ColaboradorResponse extends ColaboradorBase {
  razonSocialId: RazonSocial;
}

type Colaborador = ColaboradorCreate | ColaboradorResponse;

// Función auxiliar para validar si un objeto es RazonSocial
function isRazonSocial(obj: any): obj is RazonSocial {
  return obj && typeof obj === 'object' && '_id' in obj && 'nombre' in obj;
}

// Función para validar y formatear NSS
const parseNSS = (value: string): string => {
  return value.replace(/\D/g, '').substring(0, 11);
};

const emptyColaborador: Colaborador = {
  nombre: '',
  nss: '',
  puesto: '',
  fechaAltaIMSS: '',
  razonSocialId: '',
  activo: true
};

const ColaboradorList: React.FC = () => {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [filteredColaboradores, setFilteredColaboradores] = useState<Colaborador[]>([]);
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newColaborador, setNewColaborador] = useState<Colaborador>({ ...emptyColaborador });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const itemsPerPage = 10;

  const urlServer = import.meta.env.VITE_API_URL;

  const fetchColaboradores = async () => {
    try {
      const res = await axios.get<Colaborador[]>(`${urlServer}colaboradores`);
      setColaboradores(res.data);
      setFilteredColaboradores(res.data);
    } catch (err) {
      console.error('Error al cargar colaboradores:', err);
    }
  };

  const fetchRazonesSociales = async () => {
    try {
      const res = await axios.get<RazonSocial[]>(`${urlServer}razones-sociales`);
      setRazonesSociales(res.data);
    } catch (err) {
      console.error('Error al cargar razones sociales:', err);
    }
  };

  useEffect(() => {
    fetchColaboradores();
    fetchRazonesSociales();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Resetear a la primera página cuando se busca
    
    const lower = term.toLowerCase().trim();
    const filtered = !lower
      ? colaboradores
      : colaboradores.filter(c =>
          (c.numeroEmpleado || '').toString().toLowerCase().includes(lower) ||
          c.nombre.toLowerCase().includes(lower) ||
          c.nss.toLowerCase().includes(lower) ||
          c.puesto.toLowerCase().includes(lower)
        );

    setFilteredColaboradores(filtered);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    } else {
      setSelectedFile(null);
    }
    console.log('Archivo seleccionado:', e.target.files ? e.target.files[0]?.name : 'No hay archivo');
  };

  const handleSave = async () => {
    try {
      // Validar campos requeridos
      const camposRequeridos = {
        nombre: 'Nombre',
        nss: 'NSS',
        puesto: 'Puesto',
        fechaAltaIMSS: 'Fecha Alta IMSS',
        razonSocialId: 'Razón Social'
      };

      const camposFaltantes = Object.entries(camposRequeridos)
        .filter(([key]) => {
          const value = newColaborador[key as keyof Colaborador];
          // Para el NSS, verificar que tenga exactamente 11 dígitos
          if (key === 'nss') {
            return !value || parseNSS(value as string).length !== 11;
          }
          return !value;
        })
        .map(([_, label]) => label);

      if (camposFaltantes.length > 0) {
        toast.error(`Por favor completa los siguientes campos obligatorios: ${camposFaltantes.join(', ')}`);
        return;
      }
      
      console.log('Datos del colaborador antes de enviar:', newColaborador);
      
      // Crear el objeto de datos directamente, asegurando que el NSS tenga el formato correcto
      const colaboradorData = {
        ...newColaborador,
        nss: parseNSS(newColaborador.nss), // Asegurar formato correcto del NSS
        fechaAltaIMSS: new Date(newColaborador.fechaAltaIMSS).toISOString(),
        razonSocialId: newColaborador.razonSocialId
      };

      console.log('Enviando datos:', colaboradorData);

      let response;
      
      // Debugging del estado del archivo
      console.log('Estado del archivo:', {
        hayArchivo: !!selectedFile,
        nombreArchivo: selectedFile?.name || 'No hay archivo'
      });

      // Asegurarse de que selectedFile sea null si no hay archivo
      if (!selectedFile) {
        // Si no hay archivo, enviar JSON directamente
        const config = {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        };

        console.log('Enviando como JSON:', {
          dataType: 'JSON',
          data: colaboradorData,
          headers: config.headers
        });

        try {
          if (editId) {
            response = await axios.put(`${urlServer}colaboradores/${editId}`, colaboradorData, config);
          } else {
            response = await axios.post(`${urlServer}colaboradores`, colaboradorData, config);
          }
        } catch (error: any) {
          console.error('Error en la petición:', {
            config: error.config,
            headers: error.config?.headers,
            data: error.config?.data,
            response: error.response?.data
          });
          throw error;
        }
      } else {
        // Si hay archivo, usar FormData
        const formData = new FormData();
        // Agregar cada campo individualmente para asegurar el tipo correcto
        formData.append('nombre', colaboradorData.nombre);
        formData.append('nss', colaboradorData.nss);
        formData.append('puesto', colaboradorData.puesto);
        formData.append('fechaAltaIMSS', colaboradorData.fechaAltaIMSS);
        // Asegurarse de que razonSocialId sea una cadena válida
        const razonSocialIdStr = typeof colaboradorData.razonSocialId === 'string' 
          ? colaboradorData.razonSocialId 
          : (colaboradorData.razonSocialId?._id || '');
        if (razonSocialIdStr) {
          formData.append('razonSocialId', razonSocialIdStr);
        }
        formData.append('activo', String(colaboradorData.activo));
        formData.append('fotografia', selectedFile);
        
        // Log detallado del FormData
        console.log('Contenido del FormData:', {
          file: selectedFile,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
            key,
            value: value instanceof File ? `File: ${value.name}` : value
          }))
        });

        console.log('Enviando como FormData:', {
          dataType: 'FormData',
          fields: Object.fromEntries(formData.entries())
        });

        if (editId) {
          response = await axios.put(`${urlServer}colaboradores/${editId}`, formData);
        } else {
          response = await axios.post(`${urlServer}colaboradores`, formData);
        }
      }

      // Log detallado de la respuesta
      console.log('Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      });

      if (response.status === 201 || response.status === 200) {
        toast.success(editId ? 'Colaborador actualizado exitosamente' : 'Colaborador creado exitosamente');
        setShowModal(false);
        setNewColaborador({ ...emptyColaborador });
        setEditId(null);
        setSelectedFile(null);
        fetchColaboradores();
      }
    } catch (err: any) {
      console.error('Error al guardar colaborador:', err);
      
      // Log detallado del error
      const errorDetails = {
        status: err.response?.status,
        statusText: err.response?.statusText,
        message: err.message,
        responseData: err.response?.data,
        requestData: err.config?.data,
        headers: err.config?.headers,
        method: err.config?.method,
        url: err.config?.url
      };
      
      console.error('Detalles completos del error:', errorDetails);

      // Intentar obtener un mensaje de error amigable
      let errorMessage = 'Error al guardar el colaborador';
      
      if (err.response?.data?.error) {
        // Si es un error de validación del servidor
        errorMessage = err.response.data.error;
        if (errorMessage.includes('Path')) {
          // Convertir mensajes de error de MongoDB a formato más amigable
          errorMessage = errorMessage
            .replace(/Path `(\w+)` is required/g, 'El campo "$1" es obligatorio')
            .replace(/numeroEmpleado/g, 'Número de Empleado')
            .replace(/razonSocialId/g, 'Razón Social')
            .replace(/fechaAltaIMSS/g, 'Fecha Alta IMSS');
        }
      } else if (err.response?.status === 400) {
        errorMessage = 'Error en los datos enviados. Por favor verifica la información.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Error interno del servidor. Por favor intenta más tarde.';
      }

      toast.error(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro que desea eliminar este colaborador? Esta acción no se puede deshacer.')) return;
    try {
      await axios.delete(`${urlServer}colaboradores/${id}`);
      toast.success('Colaborador eliminado exitosamente');
      fetchColaboradores();
    } catch (err) {
      console.error('Error al eliminar colaborador:', err);
      toast.error('Error al eliminar el colaborador');
    }
  };

  const handleEdit = (colaborador: Colaborador) => {
    try {
      console.log('Datos del colaborador a editar:', colaborador);
      
      setEditId(colaborador._id || null);
      
      // Manejo seguro de razonSocialId
      let razonSocialIdValue = '';
      if (colaborador.razonSocialId) {
        if (typeof colaborador.razonSocialId === 'object' && colaborador.razonSocialId !== null) {
          razonSocialIdValue = colaborador.razonSocialId._id || '';
        } else {
          razonSocialIdValue = colaborador.razonSocialId;
        }
      }

      const colaboradorToEdit = {
        ...colaborador,
        razonSocialId: razonSocialIdValue
      };
      
      // Manejo seguro de la fecha
      let fechaFormateada;
      try {
        fechaFormateada = format(new Date(colaborador.fechaAltaIMSS), 'yyyy-MM-dd');
      } catch (err) {
        console.error('Error al formatear la fecha:', err);
        fechaFormateada = new Date().toISOString().split('T')[0]; // Fecha actual como fallback
      }

      console.log('Datos preparados para edición:', {
        ...colaboradorToEdit,
        fechaAltaIMSS: fechaFormateada
      });

      setNewColaborador({
        ...colaboradorToEdit,
        fechaAltaIMSS: fechaFormateada
      });
      setShowModal(true);
    } catch (err) {
      console.error('Error al preparar edición del colaborador:', err);
      toast.error('Error al cargar los datos del colaborador');
    }
  };

  const columns: DataTableColumn<Colaborador>[] = [
    { key: 'numeroEmpleado', label: 'No. Empleado' },
    { 
      key: 'fotografia', 
      label: 'Foto',
      render: (colaborador) => {
        const getImageUrl = (path: string) => {
          const baseUrl = urlServer.replace(/\/api\/?$/, '');
          return path.startsWith('/api/') ? `${baseUrl}${path}` : `${baseUrl}/api${path}`;
        };

        return colaborador.fotografia ? (
          <div style={{ cursor: 'pointer' }} onClick={() => {
            setSelectedImage(getImageUrl(colaborador.fotografia!));
            setShowImageModal(true);
          }}>
            <Image 
              src={getImageUrl(colaborador.fotografia)}
              alt={`Foto de ${colaborador.nombre}`}
              className={`colaborador-image has-image`}
              style={{ 
                width: '50px', 
                height: '50px', 
                objectFit: 'cover',
                transition: 'transform 0.2s',
                backgroundColor: '#f0f0f0'
              }} 
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const target = e.target as HTMLImageElement;
                if (target.src !== `${window.location.origin}/test.png`) {
                  console.log('Cargando imagen por defecto para:', colaborador.nombre);
                  target.src = '/test.png';
                }
              }}
              rounded 
            />
          </div>
        ) : (
          <div className="text-muted">Sin foto</div>
        );
      }
    },
    { key: 'nombre', label: 'Nombre' },
    { key: 'nss', label: 'NSS' },
    { key: 'puesto', label: 'Puesto' },
    { 
      key: 'fechaAltaIMSS', 
      label: 'Fecha Alta IMSS',
      render: (colaborador) => format(new Date(colaborador.fechaAltaIMSS), 'dd/MM/yyyy')
    },
    { 
      key: 'razonSocialId', 
      label: 'Razón Social',
      render: (colaborador) => {
        // Si razonSocialId es un objeto con nombre, usar ese nombre
        if (typeof colaborador.razonSocialId === 'object' && colaborador.razonSocialId !== null && 'nombre' in colaborador.razonSocialId) {
          return colaborador.razonSocialId.nombre;
        }
        // Si es un string (ID), buscar en razonesSociales
        if (typeof colaborador.razonSocialId === 'string') {
          const razonSocial = razonesSociales.find(r => r._id === colaborador.razonSocialId);
          return razonSocial?.nombre || 'No asignada';
        }
        return 'No asignada';
      }
    },

  ];

  const totalPages = Math.ceil(filteredColaboradores.length / itemsPerPage);
  const paginated = filteredColaboradores.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por número de empleado, nombre, NSS o puesto..."
          className="flex-grow-1"
        />
        <Button 
          variant="success" 
          onClick={() => { 
            setShowModal(true); 
            setEditId(null); 
            setNewColaborador({ ...emptyColaborador });
            setSelectedFile(null);
          }}
        >
          Agregar Colaborador
        </Button>
      </div>

      <div className="table-responsive" style={{ minHeight: 'calc(100vh - 270px)', maxHeight: 'calc(100vh - 270px)', overflowY: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <DataTable
          columns={columns}
          data={paginated}
          actions={(colaborador) => (
            <div className="d-flex flex-column flex-sm-row align-items-stretch gap-1">
              <Button variant="warning" size="sm" className="w-100 w-sm-auto" onClick={() => handleEdit(colaborador)}>
                Editar
              </Button>
              <Button variant="danger" size="sm" className="w-100 w-sm-auto" onClick={() => handleDelete(colaborador._id!)}>
                Eliminar
              </Button>
            </div>
          )}
          className="small"
          style={{ marginBottom: 0 }}
        />
      </div>

      <div className="d-flex justify-content-center my-3">
        <PaginationCompact currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>{editId ? 'Editar Colaborador' : 'Agregar Colaborador'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label htmlFor="nombre">Nombre</Form.Label>
                  <Form.Control 
                    id="nombre"
                    name="nombre"
                    type="text" 
                    value={newColaborador.nombre} 
                    onChange={e => setNewColaborador({ ...newColaborador, nombre: e.target.value })}
                    required
                    aria-label="Nombre"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label htmlFor="nss">NSS</Form.Label>
                  <Form.Control 
                    id="nss"
                    name="nss"
                    type="text" 
                    inputMode="numeric"
                    pattern="\d{11}"
                    value={newColaborador.nss} 
                    onChange={e => {
                      let value = e.target.value.replace(/\D/g, '');
                      if (value.length > 11) {
                        value = value.substring(0, 11);
                      }
                      setNewColaborador(prev => ({ ...prev, nss: value }));
                    }}
                    onPaste={e => {
                      e.preventDefault();
                      let value = e.clipboardData.getData('text').replace(/\D/g, '');
                      if (value.length > 11) {
                        value = value.substring(0, 11);
                      }
                      setNewColaborador(prev => ({ ...prev, nss: value }));
                    }}
                    maxLength={11}
                    placeholder="11 dígitos numéricos"
                    aria-label="NSS"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label htmlFor="puesto">Puesto</Form.Label>
                  <Form.Control 
                    id="puesto"
                    name="puesto"
                    type="text" 
                    value={newColaborador.puesto} 
                    onChange={e => setNewColaborador({ ...newColaborador, puesto: e.target.value })}
                    aria-label="Puesto"
                  />
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label htmlFor="fechaAltaIMSS">Fecha Alta IMSS</Form.Label>
                  <Form.Control 
                    id="fechaAltaIMSS"
                    name="fechaAltaIMSS"
                    type="date" 
                    value={typeof newColaborador.fechaAltaIMSS === 'string' ? newColaborador.fechaAltaIMSS : format(newColaborador.fechaAltaIMSS, 'yyyy-MM-dd')} 
                    onChange={e => setNewColaborador({ ...newColaborador, fechaAltaIMSS: e.target.value })}
                    aria-label="Fecha Alta IMSS"
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label htmlFor="razonSocialId">Razón Social</Form.Label>
                  <Form.Select 
                    id="razonSocialId"
                    name="razonSocialId"
                    value={typeof newColaborador.razonSocialId === 'object' 
                      ? (newColaborador.razonSocialId as RazonSocial)._id 
                      : (newColaborador.razonSocialId || '')
                    }
                    onChange={e => {
                      setNewColaborador({ 
                        ...newColaborador, 
                        razonSocialId: e.target.value
                      });
                    }}
                    aria-label="Razón Social"
                  >
                    <option value="">Seleccione una razón social</option>
                    {razonesSociales.map(razon => (
                      <option key={razon._id} value={razon._id}>
                        {razon.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label htmlFor="fotografia">Fotografía</Form.Label>
                  {editId && newColaborador.fotografia && (
                    <div className="mb-2">
                      <Image 
                        src={`${urlServer.replace(/\/api\/?$/, '')}/api${newColaborador.fotografia}`} 
                        alt="Foto actual" 
                        style={{ width: '100px', height: '100px', objectFit: 'cover' }} 
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== `${window.location.origin}/test.png`) {
                            target.src = '/test.png';
                          }
                        }}
                        rounded 
                      />
                    </div>
                  )}
                  <Form.Control 
                    id="fotografia"
                    name="fotografia"
                    type="file" 
                    onChange={handleFileChange}
                    accept="image/*"
                    aria-label="Fotografía"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Guardar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para mostrar imagen en tamaño completo */}
      <Modal 
        show={showImageModal} 
        onHide={() => setShowImageModal(false)}
        size="lg"
        centered
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>Vista previa de la imagen</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center p-0">
          <div style={{ 
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f8f9fa',
            padding: '2rem'
          }}>
            {selectedImage ? (
              <div className="text-center">
                <Image
                  src={selectedImage}
                  alt="Vista previa"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(80vh - 4rem)',
                    objectFit: 'contain',
                    backgroundColor: '#f0f0f0'
                  }}
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== `${window.location.origin}/test.png`) {
                      console.log('Cargando imagen por defecto en modal');
                      target.src = '/test.png';
                    }
                  }}
                  className="img-fluid"
                />
              </div>
            ) : (
              <div className="text-center">
                <Image
                  src="/test.png"
                  alt="Sin imagen"
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(80vh - 4rem)',
                    objectFit: 'contain'
                  }}
                  className="img-fluid"
                />
                <p className="mt-3">No hay imagen disponible</p>
              </div>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default ColaboradorList;
