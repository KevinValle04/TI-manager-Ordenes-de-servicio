import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { Entrega, Cliente, IInventoryItem, RazonSocial, ItemEntrega, Proyecto } from '../../types';

type EntregaFormData = Omit<Entrega, 'fechaCreacion' | 'fechaActualizacion'> & {
  fecha: string;
  items: ItemEntrega[];
}

interface EntregaModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<Entrega>) => void;
  editingEntrega: Entrega | null;
  clientes: Cliente[];
  inventarioItems: IInventoryItem[];
  razonesSociales: RazonSocial[];
  proyectos: Proyecto[];
  generateEntregaNumber: (clienteNombre: string) => string;
}

const EntregaModal = ({
  show,
  onHide,
  onSave,
  editingEntrega,
  clientes,
  inventarioItems,
  razonesSociales,
  proyectos,
  generateEntregaNumber
}: EntregaModalProps): React.ReactPortal => {
  const defaultFormData: EntregaFormData = {
    cliente: '',
    razonSocial: '',
    numeroEntrega: '',
    fecha: new Date().toISOString().split('T')[0],
    items: [{
      clave: 1,
      marca: '',
      modelo: '',
      concepto: '',
      cantidad: 1,
      unidad: 'PZA' as const
    }],
    comentarios: ''
  };

  // Estados del formulario
  const [formData, setFormData] = useState<EntregaFormData>(defaultFormData);

  // Estados para autocompletado
  const [clienteSuggestions, setClienteSuggestions] = useState<Cliente[]>([]);
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [razonSocialSuggestions, setRazonSocialSuggestions] = useState<RazonSocial[]>([]);
  const [showRazonSocialSuggestions, setShowRazonSocialSuggestions] = useState(false);
  const [razonSocialDisplayText, setRazonSocialDisplayText] = useState('');
  
  // Estados para productos
  const [productSuggestions, setProductSuggestions] = useState<{[key: number]: IInventoryItem[]}>({});
  const [showProductSuggestions, setShowProductSuggestions] = useState<{[key: number]: boolean}>({}); 
  const [activeRow, setActiveRow] = useState<number | null>(null);
  
  // Estados para drag & drop
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  
  // Estados para el modal de búsqueda de canalizaciones
  const [showCanalizacionModal, setShowCanalizacionModal] = useState(false);
  const [canalizaciones, setCanalizaciones] = useState<any[]>([]);
  const [canalizacionSearchTerm, setCanalizacionSearchTerm] = useState('');

  // Función para buscar canalizaciones
  const searchCanalizaciones = async (searchTerm: string) => {
    try {
      setCanalizacionSearchTerm(searchTerm);
      const response = await fetch(`/api/Entregaes-canalizacion/search?term=${searchTerm}`);
      if (response.ok) {
        const data = await response.json();
        setCanalizaciones(data);
      }
    } catch (error) {
      console.error('Error al buscar canalizaciones:', error);
    }
  };

  // Función para añadir una canalización como ítem
  const addCanalizacion = (canalizacion: any) => {
    const newItem = {
      clave: formData.items.length + 1,
      marca: 'CANALIZACIÓN',
      modelo: canalizacion.numeroPresupuesto,
      concepto: `Canalización: ${canalizacion.numeroPresupuesto} - ${canalizacion.cliente}`,
      cantidad: 1,
      unidad: 'PZA' as const
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items.filter(item => item.concepto.trim() !== ''), newItem, {
        clave: prev.items.length + 2,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA'
      }]
    }));

    setShowCanalizacionModal(false);
  };

  // Efecto para cargar datos de edición
  useEffect(() => {
    if (editingEntrega) {
      const razonSocialObj = typeof editingEntrega.razonSocial === 'object' ? editingEntrega.razonSocial : null;
      setRazonSocialDisplayText(razonSocialObj?.nombre || '');
      
      setFormData({
        ...editingEntrega,
        fecha: editingEntrega.fecha ? new Date(editingEntrega.fecha).toISOString().split('T')[0] : '',
        cliente: typeof editingEntrega.cliente === 'string' 
          ? editingEntrega.cliente 
          : editingEntrega.cliente?._id || '',
        razonSocial: typeof editingEntrega.razonSocial === 'string' 
          ? editingEntrega.razonSocial 
          : editingEntrega.razonSocial?._id || '',
      } as EntregaFormData);
    } else {
      // Para nueva entrega, generar número basado en el cliente cuando se seleccione
      setFormData(prev => ({
        ...prev,
        numeroEntrega: ''
      }));
    }
  }, [editingEntrega]);

  // Debug: Ver items de inventario cargados
  useEffect(() => {
    console.log('=== DEBUG INVENTARIO ===');
    console.log('Total items en inventario:', inventarioItems.length);
    if (inventarioItems.length > 0) {
      console.log('Primer item del inventario:', inventarioItems[0]);
      console.log('Campos disponibles:', Object.keys(inventarioItems[0]));
    }
    console.log('=======================');
  }, [inventarioItems]);

  // Funciones de manejo de formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredData = {
      ...formData,
      items: formData.items.filter(item => item.concepto.trim() !== '')
    };
    onSave(filteredData);
  };

  // Asegurar que siempre haya una fila vacía al final
  const ensureEmptyRow = (items: ItemEntrega[]): ItemEntrega[] => {
    if (items.length === 0 || items[items.length - 1].concepto !== '') {
      const newIndex = items.length + 1;
      return [...items, { 
        clave: newIndex,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA' as const
      }];
    }
    return items;
  };

  // Función auxiliar para calcular totales (no se usa en entregas pero evita errores)
  const calculateTotals = () => {
    // Esta función puede quedarse vacía ya que las entregas no calculan totales
  };

  // Funciones de manejo de drag & drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null);
    (e.target as HTMLElement).style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedItem === null || draggedItem === dropIndex) {
      return;
    }

    const items = [...(formData.items || [])];
    
    // No permitir reordenar la última fila vacía
    if (dropIndex === items.length - 1 && items[dropIndex].concepto === '') {
      return;
    }
    
    // No permitir arrastrar la última fila vacía
    if (draggedItem === items.length - 1 && items[draggedItem].concepto === '') {
      return;
    }

    // Reordenar los elementos
    const draggedElement = items[draggedItem];
    items.splice(draggedItem, 1);
    items.splice(dropIndex, 0, draggedElement);

    // Asegurar fila vacía al final
    const updatedItems = ensureEmptyRow(items);

    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Manejo de clientes
  const handleClienteSearch = (value: string) => {
    setFormData(prev => ({ ...prev, cliente: value }));
    
    if (value.length > 1) {
      const filtered = clientes.filter(cliente =>
        cliente.nombreEmpresa.toLowerCase().includes(value.toLowerCase())
      );
      setClienteSuggestions(filtered);
      setShowClienteSuggestions(true);
    } else {
      setShowClienteSuggestions(false);
    }
  };

  const selectCliente = (cliente: Cliente) => {
    const clienteNombre = cliente.nombreEmpresa;
    setFormData(prev => ({ 
      ...prev, 
      cliente: clienteNombre,
      numeroEntrega: editingEntrega ? prev.numeroEntrega : generateEntregaNumber(clienteNombre)
    }));
    setShowClienteSuggestions(false);
  };

  // Manejo de razones sociales
  const handleRazonSocialSearch = (value: string) => {
    setRazonSocialDisplayText(value);
    
    if (value.length > 1) {
      const filtered = razonesSociales.filter(razonSocial =>
        razonSocial.nombre.toLowerCase().includes(value.toLowerCase()) ||
        razonSocial.rfc.toLowerCase().includes(value.toLowerCase())
      );
      setRazonSocialSuggestions(filtered);
      setShowRazonSocialSuggestions(true);
    } else {
      setShowRazonSocialSuggestions(false);
      if (value === '') {
        setFormData(prev => ({ ...prev, razonSocial: '' }));
      }
    }
  };

  const selectRazonSocial = (razonSocial: RazonSocial) => {
    setFormData(prev => ({ ...prev, razonSocial: razonSocial._id || '' }));
    setRazonSocialDisplayText(razonSocial.nombre);
    setShowRazonSocialSuggestions(false);
  };

  // Manejo de productos
  const handleProductFocus = (index: number) => {
    setActiveRow(index);
  };
  
  // Cierra las sugerencias cuando se hace click fuera
  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    // No cerrar si el click fue dentro de un dropdown de sugerencias
    if (target.closest('.position-absolute')) {
      return;
    }
    setShowProductSuggestions({});
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside as any);
    return () => {
      document.removeEventListener('click', handleClickOutside as any);
    };
  }, []);

  const handleProductSearch = (index: number, value: string, field: 'marca' | 'modelo' | 'concepto') => {
    handleItemChange(index, field, value);
    setActiveRow(index);
    
    console.log('=== BÚSQUEDA DE PRODUCTO ===');
    console.log('Campo:', field);
    console.log('Valor buscado:', value);
    console.log('Total items disponibles:', inventarioItems.length);
    
    if (value.length > 1) {
      const searchTerm = value.toLowerCase().trim();
      const filtered = inventarioItems.filter(item => {
        const descripcion = (item.descripcion || '').toLowerCase();
        const marca = (item.marca || '').toLowerCase();
        const modelo = (item.modelo || '').toLowerCase();
        
        const matches = descripcion.includes(searchTerm) || 
               marca.includes(searchTerm) || 
               modelo.includes(searchTerm);
        
        if (matches) {
          console.log('Match encontrado:', {
            descripcion: item.descripcion,
            marca: item.marca,
            modelo: item.modelo
          });
        }
        
        return matches;
      }).slice(0, 10);
      
      console.log('Resultados filtrados:', filtered.length);
      
      setProductSuggestions(prev => ({
        ...prev,
        [index]: filtered
      }));
      setShowProductSuggestions(prev => ({
        ...prev,
        [index]: true
      }));
    } else {
      setShowProductSuggestions(prev => ({
        ...prev,
        [index]: false
      }));
    }
    console.log('============================');
  };

  const handleItemChange = (index: number, name: keyof ItemEntrega, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      
      if (name === 'material' && value) {
        // Si se está seleccionando un material del catálogo
        const selectedItem = inventarioItems.find(item => item._id === value);
        if (selectedItem) {
          const unidad = (selectedItem.unidad === 'PZA' || selectedItem.unidad === 'MTS') ? selectedItem.unidad : 'PZA' as const;
          const cantidad = newItems[index]?.cantidad || 1;
          const concepto = [
            selectedItem.descripcion,
            selectedItem.marca,
            selectedItem.modelo
          ].filter(Boolean).join(' - ');
          newItems[index] = {
            ...newItems[index],
            clave: index + 1,
            marca: selectedItem.marca,
            modelo: selectedItem.modelo,
            concepto: concepto,
            unidad,
            cantidad
          };
        }
      } else {
        const currentItem = newItems[index];
        const updatedItem: ItemEntrega = {
          ...currentItem,
          [name]: value,
          unidad: currentItem.unidad || 'PZA' as const,
          clave: currentItem.clave || index + 1
        };

        newItems[index] = updatedItem;
      }

      // Siempre asegurar que haya una fila vacía al final
      const updatedItems = ensureEmptyRow(newItems).map((item, idx) => ({
        ...item,
        clave: idx + 1
      }));

      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  // Función para seleccionar un producto desde las sugerencias
  const selectProductSuggestion = (index: number, suggestion: IInventoryItem) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      const updatedItem: ItemEntrega = {
        ...newItems[index],
        marca: suggestion.marca,
        modelo: suggestion.modelo,
        concepto: suggestion.descripcion,
        unidad: (suggestion.unidad === 'PZA' || suggestion.unidad === 'MTS') ? suggestion.unidad as 'PZA' | 'MTS' : 'PZA',
        precioUnitario: suggestion.precioUnitario,
        material: suggestion._id,
        importe: (newItems[index].cantidad || 1) * suggestion.precioUnitario,
        aplicarIva: true
      };
      newItems[index] = updatedItem;

      // Asegurar que haya una fila vacía al final
      const updatedItems = ensureEmptyRow(newItems).map((item, idx) => ({
        ...item,
        clave: idx + 1
      }));

      return {
        ...prev,
        items: updatedItems
      };
    });
    
    setShowProductSuggestions(prev => ({
      ...prev,
      [index]: false
    }));
  };

  return createPortal(
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>
            {editingEntrega ? 'Editar' : 'Nueva'} Entrega
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Form>
            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-2">
                  <Form.Label>Cliente</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      value={typeof formData.cliente === 'string' ? formData.cliente : formData.cliente?.nombreEmpresa || ''}
                      onChange={(e) => handleClienteSearch(e.target.value)}
                      placeholder="Buscar cliente..."
                      autoComplete="off"
                    />
                    {showClienteSuggestions && clienteSuggestions.length > 0 && (
                      <div className="position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                        {clienteSuggestions.map(cliente => (
                          <div
                            key={cliente._id}
                            className="p-2 border-bottom cursor-pointer hover-bg-light"
                            onClick={() => selectCliente(cliente)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <strong>{cliente.nombreEmpresa}</strong><br />
                            <small className="text-muted">{cliente.direccion}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-2">
                  <Form.Label>Razón Social</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      value={razonSocialDisplayText}
                      onChange={(e) => handleRazonSocialSearch(e.target.value)}
                      placeholder="Buscar razón social..."
                      autoComplete="off"
                    />
                    {showRazonSocialSuggestions && razonSocialSuggestions.length > 0 && (
                      <div className="position-absolute w-100 bg-white border border-top-0 rounded-bottom shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                        {razonSocialSuggestions.map(razonSocial => (
                          <div
                            key={razonSocial._id}
                            className="p-2 border-bottom cursor-pointer hover-bg-light"
                            onClick={() => selectRazonSocial(razonSocial)}
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <strong>{razonSocial.nombre}</strong><br />
                            <small className="text-muted">RFC: {razonSocial.rfc}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group className="mb-2">
                  <Form.Label>No. de Entrega</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numeroEntrega}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroEntrega: e.target.value }))}
                    readOnly={!editingEntrega}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Fecha</Form.Label>
                  <Form.Control
                    type="date"
                    name="fecha"
                    value={typeof formData.fecha === 'string' ? formData.fecha : ''}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>
                    Proyecto <small className="text-muted">(Opcional)</small>
                  </Form.Label>
                  <Form.Select
                    name="proyecto"
                    value={typeof formData.proyecto === 'string' ? formData.proyecto : formData.proyecto?._id || ''}
                    onChange={handleChange}
                  >
                    <option value="">Sin proyecto asignado</option>
                    {proyectos.map(proyecto => (
                      <option key={proyecto._id} value={proyecto._id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-12">
                <Form.Group>
                  <Form.Label>Comentarios</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="comentarios"
                    value={formData.comentarios || ''}
                    onChange={handleChange}
                  />
                </Form.Group>
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="text-primary mb-0">
                  <i className="fas fa-shopping-cart me-2"></i>
                  Productos en la Entrega
                </h5>
                  <Button 
                  variant="outline-primary"
                  onClick={() => setShowCanalizacionModal(true)}
                >
                  <i className="fas fa-plus me-2"></i>
                  Añadir Canalización
                </Button>
              </div>

              {/* Modal de búsqueda de canalizaciones */}
              <Modal 
                show={showCanalizacionModal} 
                onHide={() => setShowCanalizacionModal(false)}
                size="lg"
              >
                <Modal.Header closeButton>
                  <Modal.Title>Buscar Canalización</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Buscar por comentario, número de canalización o cliente..."
                      value={canalizacionSearchTerm}
                      onChange={(e) => searchCanalizaciones(e.target.value)}
                      autoFocus
                    />
                    <Form.Text className="text-muted">
                      Escribe el título o descripción de la canalización que buscas
                    </Form.Text>
                  </Form.Group>
                  {canalizaciones.length === 0 && canalizacionSearchTerm ? (
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      No se encontraron canalizaciones. Intenta con otro término de búsqueda.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-dark">
                          <tr>
                            <th>No. Presupuesto</th>
                            <th>Comentarios/Título</th>
                            <th>Cliente</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {canalizaciones.map(canalizacion => (
                            <tr key={canalizacion._id}>
                              <td>{canalizacion.numeroPresupuesto}</td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: '300px' }} title={canalizacion.comentarios}>
                                  {canalizacion.comentarios || <span className="text-muted">Sin comentarios</span>}
                                </div>
                              </td>
                              <td>{canalizacion.cliente}</td>
                              <td>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => addCanalizacion(canalizacion)}
                                >
                                  <i className="fas fa-plus me-1"></i>
                                  Añadir
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Modal.Body>
              </Modal>
              <div className="table-responsive" style={{ 
                maxWidth: '100%', 
                minHeight: '400px',
                maxHeight: '600px', 
                overflowX: 'auto', 
                overflowY: 'auto',
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem'
              }}>
                <table className="table table-striped table-hover mb-0" style={{ minWidth: '1200px' }}>
                  <thead className="table-dark" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '40px' }}>⋮⋮</th>
                      <th style={{ width: '80px' }}>CLAVE</th>
                      <th style={{ width: '20%' }}>MARCA</th>
                      <th style={{ width: '20%' }}>MODELO</th>
                      <th style={{ width: '30%' }}>CONCEPTO</th>
                      <th style={{ width: '80px' }}>U</th>
                      <th style={{ width: '100px' }}>CANT</th>
                      <th style={{ width: '80px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items && formData.items.map((item, index) => (
                      <tr 
                        key={index}
                        draggable={item.concepto !== ''}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        style={{
                          cursor: item.concepto !== '' ? 'move' : 'default',
                          backgroundColor: draggedItem === index ? '#f8f9fa' : 'transparent'
                        }}
                      >
                        <td className="text-center" style={{ cursor: item.concepto !== '' ? 'grab' : 'default' }}>
                          {item.concepto !== '' && (
                            <FontAwesomeIcon 
                              icon={faGripVertical} 
                              className="text-muted"
                              title="Arrastrar para reordenar"
                            />
                          )}
                        </td>
                        <td>{item.clave || index + 1}</td>
                        <td>
                          <div className="position-relative">
                            <Form.Control
                              type="text"
                              value={item.marca || ''}
                              onChange={(e) => handleProductSearch(index, e.target.value, 'marca')}
                              onFocus={() => handleProductFocus(index)}
                              placeholder="Marca..."
                              autoComplete="off"
                            />
                            {showProductSuggestions[index] && productSuggestions[index]?.length > 0 && (
                              <div className="position-absolute w-100 bg-white border rounded shadow-sm" 
                                   style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {productSuggestions[index].map((suggestion) => (
                                  <div
                                    key={suggestion._id}
                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectProductSuggestion(index, suggestion);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                  >
                                    <div><strong>{suggestion.marca}</strong></div>
                                    <div className="small text-muted">{suggestion.descripcion}</div>
                                    <div className="small text-muted">
                                      Modelo: {suggestion.modelo}
                                      <span className="float-end text-success">
                                        ${suggestion.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="position-relative">
                            <Form.Control
                              type="text"
                              value={item.modelo || ''}
                              onChange={(e) => handleProductSearch(index, e.target.value, 'modelo')}
                              onFocus={() => handleProductFocus(index)}
                              placeholder="Modelo..."
                              autoComplete="off"
                            />
                            {showProductSuggestions[index] && productSuggestions[index]?.length > 0 && (
                              <div className="position-absolute w-100 bg-white border rounded shadow-sm" 
                                   style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {productSuggestions[index].map((suggestion) => (
                                  <div
                                    key={suggestion._id}
                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectProductSuggestion(index, suggestion);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                  >
                                    <div><strong>{suggestion.modelo}</strong></div>
                                    <div className="small text-muted">{suggestion.descripcion}</div>
                                    <div className="small text-muted">
                                      Marca: {suggestion.marca}
                                      <span className="float-end text-success">
                                        ${suggestion.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="position-relative">
                            <Form.Control
                              type="text"
                              value={item.concepto || ''}
                              onChange={(e) => handleProductSearch(index, e.target.value, 'concepto')}
                              onFocus={() => handleProductFocus(index)}
                              placeholder="Concepto..."
                              autoComplete="off"
                            />
                            {showProductSuggestions[index] && productSuggestions[index]?.length > 0 && (
                              <div className="position-absolute w-100 bg-white border rounded shadow-sm" 
                                   style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {productSuggestions[index].map((suggestion) => (
                                  <div
                                    key={suggestion._id}
                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                    onClick={() => {
                                      selectProductSuggestion(index, suggestion);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                  >
                                    <div><strong>{suggestion.descripcion}</strong></div>
                                    <div className="small text-muted">
                                      <span>{suggestion.marca} - {suggestion.modelo}</span>
                                      <span className="float-end text-success">
                                        ${suggestion.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    <div className="small text-muted">
                                      Stock: {suggestion.cantidad} {suggestion.unidad}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <Form.Select
                            value={item.unidad}
                            onChange={(e) => handleItemChange(index, 'unidad', e.target.value)}
                          >
                            <option value="PZA">PZA</option>
                            <option value="MTS">MTS</option>
                            <option value="SERV">SERV</option>
                            <option value="LOTE">LOTE</option>
                          </Form.Select>
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(index, 'cantidad', parseFloat(e.target.value) || 1)}
                            min="1"
                            step="1"
                          />
                        </td>
                        <td>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveItem(index)}
                            disabled={formData.items?.length === 1 || (index === (formData.items?.length || 0) - 1 && item.concepto === '')}
                            title="Eliminar producto"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingEntrega ? 'Actualizar' : 'Guardar'} Entrega
          </Button>
        </Modal.Footer>
      </Modal>
    </>,
    document.body
  );
};

export default EntregaModal;
