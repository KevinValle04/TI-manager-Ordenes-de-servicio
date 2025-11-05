import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import { Cotizacion, Cliente, IInventoryItem, RazonSocial, ItemCotizacion } from '../../types';

// Estados adicionales para autocompletado y UI
interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}

type CotizacionFormData = Omit<Cotizacion, 'fechaCreacion' | 'fechaActualizacion'> & {
  fecha: string;
  vigencia: string;
  items: ItemCotizacion[];
  iva?: number;
  ivaImporte?: number;
}

interface CotizacionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<Cotizacion>) => void;
  editingCotizacion: Cotizacion | null;
  clientes: Cliente[];
  inventarioItems: IInventoryItem[];
  razonesSociales: RazonSocial[];
  generatePresupuestoNumber: () => string;
}

const CotizacionModal = ({
  show,
  onHide,
  onSave,
  editingCotizacion,
  clientes,
  inventarioItems,
  razonesSociales,
  generatePresupuestoNumber
}: CotizacionModalProps): React.ReactPortal => {
  const defaultFormData: CotizacionFormData = {
    cliente: '',
    razonSocial: '',
    numeroPresupuesto: '',
    fecha: new Date().toISOString().split('T')[0],
    vigencia: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{
      clave: 1,
      marca: '',
      modelo: '',
      concepto: '',
      cantidad: 1,
      unidad: 'PZA' as const,
      precioUnitario: 0,
      importe: 0,
      material: '',
      aplicarIva: true
    }],
    subtotal: 0,
    iva: 8,
    ivaImporte: 0,
    total: 0,
    estado: 'Borrador',
    comentarios: ''
  };

  // Estados del formulario
  const [formData, setFormData] = useState<CotizacionFormData>(defaultFormData);

  // Estados para autocompletado
  const [clienteSuggestions, setClienteSuggestions] = useState<Cliente[]>([]);
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [razonSocialSuggestions, setRazonSocialSuggestions] = useState<RazonSocial[]>([]);
  const [showRazonSocialSuggestions, setShowRazonSocialSuggestions] = useState(false);
  const [razonSocialDisplayText, setRazonSocialDisplayText] = useState('');
  
  // Estados para productos
  const [productSuggestions, setProductSuggestions] = useState<IInventoryItem[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState<{[key: number]: boolean}>({});
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({top: 0, left: 0, width: 0});
  
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
      const response = await fetch(`/api/cotizaciones-canalizacion/search?term=${searchTerm}`);
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
    setFormData(prev => ({
      ...prev,
      items: [...prev.items.filter(item => item.concepto.trim() !== ''), {
        clave: prev.items.length + 1,
        marca: 'CANALIZACIÓN',
        modelo: canalizacion.numeroPresupuesto,
        concepto: `Canalización: ${canalizacion.numeroPresupuesto} - ${canalizacion.cliente}`,
        cantidad: 1,
        unidad: 'PZA' as const,
        precioUnitario: canalizacion.total,
        importe: canalizacion.total,
        material: '',
        canalizacionId: canalizacion._id,
        esCanalizacion: true,
        aplicarIva: false // Las canalizaciones no llevan IVA por defecto
      }, {
        clave: prev.items.length + 2,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA',
        precioUnitario: 0,
        importe: 0,
        material: '',
        esCanalizacion: false,
        aplicarIva: true
      }]
    }));

    setShowCanalizacionModal(false);
    calculateTotals();
  };

  // Efecto para cargar datos de edición
  useEffect(() => {
    if (editingCotizacion) {
      const razonSocialObj = typeof editingCotizacion.razonSocial === 'object' ? editingCotizacion.razonSocial : null;
      setRazonSocialDisplayText(razonSocialObj?.nombre || '');
      
      setFormData({
        ...editingCotizacion,
        fecha: editingCotizacion.fecha ? new Date(editingCotizacion.fecha).toISOString().split('T')[0] : '',
        vigencia: editingCotizacion.vigencia ? new Date(editingCotizacion.vigencia).toISOString().split('T')[0] : '',
        cliente: typeof editingCotizacion.cliente === 'string' 
          ? editingCotizacion.cliente 
          : editingCotizacion.cliente?._id || '',
        razonSocial: typeof editingCotizacion.razonSocial === 'string' 
          ? editingCotizacion.razonSocial 
          : editingCotizacion.razonSocial?._id || '',
      } as CotizacionFormData);
    } else {
      setFormData(prev => ({
        ...prev,
        numeroPresupuesto: generatePresupuestoNumber()
      }));
    }
  }, [editingCotizacion, generatePresupuestoNumber]);

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
    onSave(formData);
  };

  // Asegurar que siempre haya una fila vacía al final
  const ensureEmptyRow = (items: ItemCotizacion[]): ItemCotizacion[] => {
    if (items.length === 0 || items[items.length - 1].concepto !== '') {
      const newIndex = items.length + 1;
      return [...items, { 
        clave: newIndex,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA' as const,
        precioUnitario: 0,
        importe: 0,
        material: '',
        aplicarIva: true
      }];
    }
    return items;
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

    // Asegurar fila vacía al final y actualizar totales
    const updatedItems = ensureEmptyRow(items);
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.importe || 0), 0);
    const ivaImporte = newSubtotal * (formData.iva || 8) / 100;
    const newTotal = newSubtotal + ivaImporte;

    setFormData({
      ...formData,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
    calculateTotals();
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
    setFormData(prev => ({ ...prev, cliente: cliente.nombreEmpresa }));
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
  const handleProductFocus = (index: number, event: React.FocusEvent) => {
    setActiveRow(index);
    
    const target = event.target as HTMLInputElement;
    const rect = target.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 2,
      left: rect.left + window.scrollX,
      width: rect.width
    });
    
    const currentValue = formData.items?.[index]?.concepto || '';
    let filtered: IInventoryItem[] = [];
    
    if (currentValue.length > 0) {
      const searchWords = currentValue.toLowerCase().trim().split(/\s+/);
      filtered = inventarioItems.filter(item => {
        const searchableText = `${item.descripcion.toLowerCase()}`;
        return searchWords.every((word: string) => searchableText.includes(word));
      });
    } else {
      filtered = inventarioItems.slice(0, 5);
    }
    
    setProductSuggestions(filtered);
    setShowProductSuggestions({ ...showProductSuggestions, [index]: true });
  };

  const hideProductSuggestions = (index: number) => {
    setTimeout(() => {
      setShowProductSuggestions(prev => ({ ...prev, [index]: false }));
      if (activeRow === index) {
        setActiveRow(null);
      }
    }, 150);
  };

  const handleProductSearch = (index: number, value: string, event?: React.ChangeEvent) => {
    handleItemChange(index, 'concepto', value);
    
    if (event) {
      const target = event.target as HTMLInputElement;
      const rect = target.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    
    let filtered: IInventoryItem[] = [];
    
    if (value.length > 0) {
      const searchWords = value.toLowerCase().trim().split(/\s+/);
      filtered = inventarioItems.filter(item => {
        const searchableText = `${item.descripcion.toLowerCase()}`;
        return searchWords.every(word => searchableText.includes(word));
      });
    } else {
      filtered = inventarioItems.slice(0, 5);
    }
    
    setProductSuggestions(filtered);
    setShowProductSuggestions(prev => ({ ...prev, [index]: true }));
    setActiveRow(index);
  };

  const handleItemChange = (index: number, name: keyof ItemCotizacion, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      
      if (name === 'material' && value) {
        // Si se está seleccionando un material del catálogo
        const selectedItem = inventarioItems.find(item => item._id === value);
        if (selectedItem) {
          const unidad = (selectedItem.unidad === 'PZA' || selectedItem.unidad === 'MTS') ? selectedItem.unidad : 'PZA' as const;
          newItems[index] = {
            ...newItems[index],
            concepto: selectedItem.descripcion,
            marca: selectedItem.marca,
            modelo: selectedItem.modelo,
            unidad,
            precioUnitario: selectedItem.precioUnitario,
            material: value,
            cantidad: newItems[index]?.cantidad || 1,
            importe: Number(newItems[index]?.cantidad || 1) * selectedItem.precioUnitario
          };
        }
      } else {
        const currentItem = newItems[index];
        const updatedItem: ItemCotizacion = {
          ...currentItem,
          [name]: value,
          unidad: currentItem.unidad || 'PZA' as const
        };

        // Recalcular subtotal si cambia cantidad o precio
        if (['cantidad', 'precioUnitario'].includes(name)) {
          updatedItem.importe = 
            Number(updatedItem.cantidad || 0) * Number(updatedItem.precioUnitario || 0);
        }

        newItems[index] = updatedItem;
      }

      const updatedItems = ensureEmptyRow(newItems);

      return {
        ...prev,
        items: updatedItems
      };
    });
    calculateTotals();
  };

  const calculateTotals = () => {
    setFormData(prev => {
      const subtotal = prev.items?.reduce((sum, item) => sum + (item.importe || 0), 0) || 0;
      // Solo calcular IVA para los items que tienen aplicarIva=true
      const subtotalConIva = prev.items?.reduce((sum, item) => sum + (item.aplicarIva ? (item.importe || 0) : 0), 0) || 0;
      const ivaImporte = subtotalConIva * (prev.iva || 8) / 100;
      const total = subtotal + ivaImporte;
      return {
        ...prev,
        subtotal,
        ivaImporte,
        total
      };
    });
  };

  useEffect(() => {
    calculateTotals();
  }, [formData.items]);

  return createPortal(
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>
            {editingCotizacion ? 'Editar' : 'Nueva'} Cotización
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
                  <Form.Label>No. Presupuesto</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numeroPresupuesto}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroPresupuesto: e.target.value }))}
                    readOnly={!editingCotizacion}
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
                  <Form.Label>Vigencia</Form.Label>
                  <Form.Control
                    type="date"
                    name="vigencia"
                    value={typeof formData.vigencia === 'string' ? formData.vigencia : ''}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Estado</Form.Label>
                  <Form.Select
                    name="estado"
                    value={formData.estado || 'Borrador'}
                    onChange={handleChange}
                    required
                  >
                    <option value="Borrador">Borrador</option>
                    <option value="Enviada">Enviada</option>
                    <option value="Aceptada">Aceptada</option>
                    <option value="Rechazada">Rechazada</option>
                    <option value="Vencida">Vencida</option>
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
                  Productos en la Cotización
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
                      placeholder="Buscar por número de presupuesto o cliente..."
                      value={canalizacionSearchTerm}
                      onChange={(e) => searchCanalizaciones(e.target.value)}
                    />
                  </Form.Group>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>No. Presupuesto</th>
                          <th>Cliente</th>
                          <th>Total</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {canalizaciones.map(canalizacion => (
                          <tr key={canalizacion._id}>
                            <td>{canalizacion.numeroPresupuesto}</td>
                            <td>{canalizacion.cliente}</td>
                            <td>${canalizacion.total.toLocaleString('es-MX', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}</td>
                            <td>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => addCanalizacion(canalizacion)}
                              >
                                Añadir
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Modal.Body>
              </Modal>
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead className="table-dark">
                    <tr>
                      <th style={{ width: '3%' }}>⋮⋮</th>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '35%' }}>Descripción</th>
                      <th style={{ width: '10%' }}>Cantidad</th>
                      <th style={{ width: '15%' }}>Precio Unitario</th>
                      <th style={{ width: '15%' }}>Importe</th>
                      <th style={{ width: '10%' }}>IVA</th>
                      <th style={{ width: '7%' }}>Acciones</th>
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
                        <td>{index + 1}</td>
                        <td>
                          <div className="position-relative">
                            <Form.Control
                              type="text"
                              value={item.concepto}
                              onChange={(e) => handleProductSearch(index, e.target.value, e)}
                              onFocus={(e) => handleProductFocus(index, e)}
                              onBlur={() => hideProductSuggestions(index)}
                              placeholder="Concepto..."
                              autoComplete="off"
                            />
                          </div>
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
                          <Form.Control
                            type="number"
                            value={item.precioUnitario}
                            onChange={(e) => handleItemChange(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td>
                          <span className="fw-bold">${(item.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={item.aplicarIva}
                            onChange={(e) => handleItemChange(index, 'aplicarIva', e.target.checked)}
                            disabled={item.esCanalizacion}
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

            {/* Totales */}
            <div className="row">
              <div className="col-md-12 d-flex justify-content-end">
                <div className="col-md-6">
                  <div className="card">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-calculator me-2"></i>
                        Resumen de Totales
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between py-2 border-bottom">
                        <span>Subtotal:</span>
                        <span className="fw-bold">${(formData.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="d-flex justify-content-between py-2 border-bottom">
                        <span>IVA ({formData.iva || 8}%):</span>
                        <span className="text-info fw-bold">${(formData.ivaImporte || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="d-flex justify-content-between py-3 bg-light rounded mt-2">
                        <span className="fw-bold text-primary">Total:</span>
                        <span className="fw-bold text-primary fs-5">${(formData.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {editingCotizacion ? 'Actualizar' : 'Guardar'} Cotización
          </Button>
        </Modal.Footer>
      </Modal>
      {showProductSuggestions[activeRow ?? -1] && (
        <div 
          className="bg-white border rounded shadow-lg" 
          style={{ 
            position: 'fixed',
            zIndex: 999999, 
            maxHeight: '200px', 
            overflowY: 'auto',
            top: dropdownPosition.top + 'px',
            left: dropdownPosition.left + 'px',
            minWidth: Math.max(dropdownPosition.width, 300) + 'px',
            maxWidth: '400px'
          }}
        >
          {productSuggestions.map(material => (
            <div
              key={material._id}
              className="p-2 border-bottom cursor-pointer hover-bg-light"
              onClick={() => activeRow !== null && handleItemChange(activeRow, 'material', material._id)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <strong>{material.descripcion}</strong><br />
              <small className="text-muted">
                Precio: ${material.precioUnitario?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </small>
            </div>
          ))}
        </div>
      )}
    </>,
    document.body
  );
};

export default CotizacionModal;