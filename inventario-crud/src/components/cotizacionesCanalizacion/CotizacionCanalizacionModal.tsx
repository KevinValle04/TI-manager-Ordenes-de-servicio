import { faGripVertical, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { createPortal } from 'react-dom';
import { Cliente, CotizacionCanalizacion, MaterialCanalizacion, RazonSocial } from '../../types';

interface CotizacionCanalizacionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<CotizacionCanalizacion>) => void;
  editingCotizacion: CotizacionCanalizacion | null;
  clientes: Cliente[];
  materiales: MaterialCanalizacion[];
  razonesSociales: RazonSocial[];
  generatePresupuestoNumber: () => string;
}

const CotizacionCanalizacionModal: React.FC<CotizacionCanalizacionModalProps> = ({
  show,
  onHide,
  onSave,
  editingCotizacion,
  clientes,
  materiales,
  razonesSociales,
  generatePresupuestoNumber
}) => {
  // Estados para formulario
  const [formData, setFormData] = useState<Partial<CotizacionCanalizacion>>({
    cliente: '',
    razonSocial: '', // Guardará el ID de la razón social
    numeroPresupuesto: '',
    fecha: new Date().toISOString().split('T')[0],
    vigencia: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [],
    subtotal: 0,
    utilidad: 30,
    total: 0,
    estado: 'Borrador',
    comentarios: ''
  });

  // Estados para autocompletado de cliente
  const [clienteSuggestions, setClienteSuggestions] = useState<Cliente[]>([]);
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);

  // Estados para autocompletado de razón social
  const [razonSocialSuggestions, setRazonSocialSuggestions] = useState<RazonSocial[]>([]);
  const [showRazonSocialSuggestions, setShowRazonSocialSuggestions] = useState(false);
  const [razonSocialDisplayText, setRazonSocialDisplayText] = useState(''); // Para mostrar el texto en el input

  // Estados para autocompletado de productos
  const [productSuggestions, setProductSuggestions] = useState<MaterialCanalizacion[]>([]);
  const [showProductSuggestions, setShowProductSuggestions] = useState<{[key: number]: boolean}>({});
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{top: number, left: number, width: number}>({top: 0, left: 0, width: 0});

  // Estados para drag & drop
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Efectos
  useEffect(() => {
    if (editingCotizacion) {
      const itemsWithEmptyRow = ensureEmptyRow(editingCotizacion.items || []);
      setFormData({ ...editingCotizacion, items: itemsWithEmptyRow });
      // Si hay razón social poblada, establecer el texto de visualización
      if (editingCotizacion.razonSocial) {
        if (typeof editingCotizacion.razonSocial === 'object') {
          setRazonSocialDisplayText(editingCotizacion.razonSocial.nombre);
        } else {
          // Si es un string (ID), buscar la razón social correspondiente
          const razonSocial = razonesSociales.find(rs => rs._id === editingCotizacion.razonSocial);
          setRazonSocialDisplayText(razonSocial ? razonSocial.nombre : '');
        }
      } else {
        setRazonSocialDisplayText('');
      }
    } else {
      resetForm();
    }
  }, [editingCotizacion, show, razonesSociales]);

  // Debug: verificar materiales
  useEffect(() => {
    console.log('Materiales disponibles:', materiales);
  }, [materiales]);

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    const vigenciaDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    setFormData({
      cliente: '',
      razonSocial: '', // Se resetea el ID
      numeroPresupuesto: generatePresupuestoNumber(),
      fecha: today,
      vigencia: vigenciaDate,
      items: [{ descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0, unidad: 'PZA' }], // Iniciar con una fila vacía
      subtotal: 0,
      utilidad: 30,
      total: 0,
      estado: 'Borrador',
      comentarios: ''
    });
    
    setRazonSocialDisplayText(''); // Se resetea el texto de visualización
    setProductSuggestions([]);
    setShowProductSuggestions({});
    setActiveRow(null);
    setDropdownPosition({top: 0, left: 0, width: 0});
  };

  // Manejar búsqueda de clientes
  const handleClienteSearch = (value: string) => {
    setFormData({ ...formData, cliente: value });
    
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

  // Seleccionar cliente
  const selectCliente = (cliente: Cliente) => {
    setFormData({ ...formData, cliente: cliente.nombreEmpresa });
    setShowClienteSuggestions(false);
  };

  // Manejar búsqueda de razones sociales
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
      // Si se borra el texto, también limpiar la razón social seleccionada
      if (value === '') {
        setFormData({ ...formData, razonSocial: '' });
      }
    }
  };

  // Seleccionar razón social
  const selectRazonSocial = (razonSocial: RazonSocial) => {
    setFormData({ ...formData, razonSocial: razonSocial._id || '' }); // Guardar el ID
    setRazonSocialDisplayText(razonSocial.nombre); // Mostrar el nombre
    setShowRazonSocialSuggestions(false);
  };

  // Actualizar utilidad y recalcular total
  const updateUtilidad = (utilidad: number) => {
    const newTotal = (formData.subtotal || 0) * (1 + utilidad / 100);
    setFormData({
      ...formData,
      utilidad,
      total: newTotal
    });
  };

  // Asegurar que siempre haya una fila vacía al final
  const ensureEmptyRow = (items: any[]) => {
    if (items.length === 0 || items[items.length - 1].descripcion !== '') {
      return [...items, { descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0, unidad: 'PZA' }];
    }
    return items;
  };

  // Manejar cambios en los items
  const handleItemChange = (index: number, field: string, value: any) => {
    const items = formData.items ? [...formData.items] : [];
    
    // Asegurar que el item existe
    if (!items[index]) {
      items[index] = { descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0, unidad: 'PZA' };
    }
    
    items[index] = { ...items[index], [field]: value };
    
    // Si es descripción, buscar en materiales para autocompletar precio
    if (field === 'descripcion' && value && materiales.length > 0) {
      // Dividir el texto de búsqueda en palabras individuales para mejor coincidencia
      const searchWords = value.toLowerCase().trim().split(/\s+/);
      
      const material = materiales.find(m => {
        const descripcionCompleta = `${m.tipo} - ${m.material}${m.medida ? ` - ${m.medida}` : ''}`;
        
        // Crear un array con todos los campos de búsqueda
        const searchableFields = [
          m.material.toLowerCase(),
          m.tipo.toLowerCase(),
          m.medida?.toLowerCase() || '',
          descripcionCompleta.toLowerCase()
        ];
        
        // Verificar que cada palabra de búsqueda aparezca en AL MENOS uno de los campos
        return searchWords.every((word: string) => 
          searchableFields.some((field: string) => field.includes(word))
        );
      });
      
      if (material) {
        items[index].precioUnitario = material.precio || 0;
      }
    }
    
    // Recalcular subtotal
    if (field === 'cantidad' || field === 'precioUnitario') {
      items[index].subtotal = (items[index].cantidad || 1) * (items[index].precioUnitario || 0);
    }
    
    // Si estamos editando la descripción y hay valor, calcular subtotal
    if (field === 'descripcion' && items[index].precioUnitario) {
      items[index].subtotal = (items[index].cantidad || 1) * items[index].precioUnitario;
    }
    
    // Asegurar fila vacía al final
    const updatedItems = ensureEmptyRow(items);
    
    // Calcular nuevos totales (excluyendo filas vacías)
    const itemsWithData = updatedItems.filter(item => item.descripcion !== '');
    const newSubtotal = itemsWithData.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const newTotal = newSubtotal * (1 + (formData.utilidad || 30) / 100);
    
    setFormData({
      ...formData,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal
    });
  };

  // Buscar productos para autocompletar
  const handleProductSearch = (index: number, value: string, event?: React.ChangeEvent) => {
    console.log('Buscando productos para:', value, 'Total materiales:', materiales.length);
    handleItemChange(index, 'descripcion', value);
    
    // Recalcular posición si hay evento
    if (event) {
      const target = event.target as HTMLInputElement;
      const rect = target.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    
    let filtered: MaterialCanalizacion[] = [];
    
    if (value.length > 0) {
      // Dividir el texto de búsqueda en palabras individuales
      const searchWords = value.toLowerCase().trim().split(/\s+/);
      
      filtered = materiales.filter(material => {
        const descripcionCompleta = `${material.tipo} - ${material.material}${material.medida ? ` - ${material.medida}` : ''}`;
        
        // Crear un array con todos los campos de búsqueda
        const searchableFields = [
          material.material.toLowerCase(),
          material.tipo.toLowerCase(),
          material.medida?.toLowerCase() || '',
          material.proveedor.toLowerCase(),
          descripcionCompleta.toLowerCase()
        ];
        
        // Verificar que cada palabra de búsqueda aparezca en AL MENOS uno de los campos
        return searchWords.every(word => 
          searchableFields.some(field => field.includes(word))
        );
      });
    } else {
      // Si no hay texto, mostrar algunos productos como ejemplo
      filtered = materiales.slice(0, 5); // Mostrar los primeros 5
    }
    
    console.log('Productos filtrados:', filtered);
    setProductSuggestions(filtered);
    setShowProductSuggestions({ ...showProductSuggestions, [index]: true });
    setActiveRow(index);
  };

  // Manejar el foco en el campo de descripción
  const handleProductFocus = (index: number, event: React.FocusEvent) => {
    console.log('Foco en fila:', index);
    setActiveRow(index);
    
    // Calcular posición para el dropdown
    const target = event.target as HTMLInputElement;
    const rect = target.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY + 2,
      left: rect.left + window.scrollX,
      width: rect.width
    });
    
    const currentValue = formData.items?.[index]?.descripcion || '';
    
    let filtered: MaterialCanalizacion[] = [];
    
    if (currentValue.length > 0) {
      // Dividir el texto de búsqueda en palabras individuales
      const searchWords = currentValue.toLowerCase().trim().split(/\s+/);
      
      filtered = materiales.filter(material => {
        const descripcionCompleta = `${material.tipo} - ${material.material}${material.medida ? ` - ${material.medida}` : ''}`;
        
        // Crear un array con todos los campos de búsqueda
        const searchableFields = [
          material.material.toLowerCase(),
          material.tipo.toLowerCase(),
          material.medida?.toLowerCase() || '',
          material.proveedor.toLowerCase(),
          descripcionCompleta.toLowerCase()
        ];
        
        // Verificar que cada palabra de búsqueda aparezca en AL MENOS uno de los campos
        return searchWords.every(word => 
          searchableFields.some(field => field.includes(word))
        );
      });
    } else {
      // Mostrar algunos productos como ejemplo cuando hace foco
      filtered = materiales.slice(0, 5);
    }
    
    console.log('Productos al hacer foco:', filtered);
    setProductSuggestions(filtered);
    setShowProductSuggestions({ ...showProductSuggestions, [index]: true });
  };

  // Cerrar sugerencias de productos
  const hideProductSuggestions = (index: number) => {
    setTimeout(() => {
      setShowProductSuggestions({ ...showProductSuggestions, [index]: false });
      if (activeRow === index) {
        setActiveRow(null);
      }
    }, 150); // Delay para permitir el clic en las sugerencias
  };

  // Seleccionar producto del autocompletado
  const selectProduct = (index: number, material: MaterialCanalizacion) => {
    const items = formData.items ? [...formData.items] : [];
    
    if (!items[index]) {
      items[index] = { descripcion: '', cantidad: 1, precioUnitario: 0, subtotal: 0, unidad: 'PZA' };
    }
    
    // Crear una descripción más completa combinando tipo, material y medida
    const descripcionCompleta = `${material.tipo} - ${material.material}${material.medida ? ` - ${material.medida}` : ''}`;
    
    items[index] = {
      ...items[index],
      descripcion: descripcionCompleta,
      precioUnitario: material.precio || 0,
      subtotal: (items[index].cantidad || 1) * (material.precio || 0)
    };
    
    // Asegurar fila vacía al final
    const updatedItems = ensureEmptyRow(items);
    
    // Calcular nuevos totales
    const itemsWithData = updatedItems.filter(item => item.descripcion !== '');
    const newSubtotal = itemsWithData.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const newTotal = newSubtotal * (1 + (formData.utilidad || 30) / 100);
    
    setFormData({
      ...formData,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal
    });
    
    setShowProductSuggestions({ ...showProductSuggestions, [index]: false });
  };

  // Remover item
  const removeItem = (index: number) => {
    const items = formData.items || [];
    
    // No permitir eliminar si es la única fila o la fila vacía final
    if (items.length <= 1) {
      return;
    }
    
    // Si es la última fila y está vacía, no hacer nada
    if (index === items.length - 1 && items[index].descripcion === '') {
      return;
    }
    
    const newItems = items.filter((_, i) => i !== index);
    
    // Asegurar que siempre haya una fila vacía al final
    const updatedItems = ensureEmptyRow(newItems);
    
    // Calcular nuevos totales (excluyendo filas vacías)
    const itemsWithData = updatedItems.filter(item => item.descripcion !== '');
    const newSubtotal = itemsWithData.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const newTotal = newSubtotal * (1 + (formData.utilidad || 30) / 100);
    
    setFormData({
      ...formData,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal
    });
  };

  // Funciones para drag & drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
    // Añadir estilo visual al elemento que se arrastra
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
    if (dropIndex === items.length - 1 && items[dropIndex].descripcion === '') {
      return;
    }
    
    // No permitir arrastrar la última fila vacía
    if (draggedItem === items.length - 1 && items[draggedItem].descripcion === '') {
      return;
    }

    // Reordenar los elementos
    const draggedElement = items[draggedItem];
    items.splice(draggedItem, 1);
    items.splice(dropIndex, 0, draggedElement);

    // Asegurar fila vacía al final
    const updatedItems = ensureEmptyRow(items);

    // Recalcular totales
    const itemsWithData = updatedItems.filter(item => item.descripcion !== '');
    const newSubtotal = itemsWithData.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const newTotal = newSubtotal * (1 + (formData.utilidad || 30) / 100);

    setFormData({
      ...formData,
      items: updatedItems,
      subtotal: newSubtotal,
      total: newTotal
    });
  };

  const handleSave = () => {
    // Validar campos requeridos
    if (!formData.cliente || formData.cliente.trim() === '') {
      alert('El cliente es requerido');
      return;
    }

    // Filtrar items vacíos antes de guardar
    const itemsToSave = (formData.items || []).filter(item => 
      item.descripcion && item.descripcion.trim() !== ''
    );
    
    // Crear una copia de formData con los items filtrados y campos limpiados
    const dataToSave = {
      ...formData,
      items: itemsToSave,
      // Convertir strings vacías a undefined para campos opcionales ObjectId
      razonSocial: formData.razonSocial && formData.razonSocial.trim() !== '' ? formData.razonSocial : undefined
    };
    
    onSave(dataToSave);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered style={{ maxWidth: '99vw', maxHeight: '95vh' }}>
      <Modal.Header closeButton className="bg-light border-bottom">
        <Modal.Title>
          {editingCotizacion ? 'Editar' : 'Nueva'} Cotización de Canalización
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="px-4 py-3" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
        <Form>
          {/* Primera fila: Cliente y Razón Social */}
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
                  onChange={(e) => setFormData({ ...formData, numeroPresupuesto: e.target.value })}
                  readOnly={!editingCotizacion}
                />
              </Form.Group>
            </div>
          </div>

          {/* Segunda fila: Número de Presupuesto */}
          <div className="row">

          </div>

          {/* Tercera fila: Fecha, Vigencia, Utilidad y Estado */}
          <div className="row">
                        <div className="col-md-6">
              <Form.Group className="mb-3">
                <Form.Label>Comentarios</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                  placeholder="Comentarios adicionales sobre la cotización..."
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group className="mb-2">
                <Form.Label>Utilidad (%)</Form.Label>
                <Form.Control
                  type="number"
                  value={formData.utilidad}
                  onChange={(e) => updateUtilidad(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.1"
                />
              </Form.Group>
            </div>
            <div className="col-md-3">
              <Form.Group className="mb-2">
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value as CotizacionCanalizacion['estado'] })}
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

          {/* Tercera fila: Comentarios */}
          <div className="row">

          </div>

          {/* Tabla de productos */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-primary mb-0">
                <i className="fas fa-shopping-cart me-2"></i>
                Productos en la Cotización
              </h5>
            </div>
            <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <table className="table table-striped table-hover" style={{ minWidth: '1200px', fontSize: '14px' }}>
                <thead className="table-dark sticky-top">
                  <tr style={{ height: '50px' }}>
                    <th style={{ width: '40px', minWidth: '40px', fontSize: '14px' }}>⋮⋮</th>
                    <th style={{ width: '50px', minWidth: '50px', fontSize: '14px' }}>#</th>
                    <th style={{ width: '500px', minWidth: '400px', fontSize: '14px' }}>Descripción</th>
                    <th style={{ width: '140px', minWidth: '120px', fontSize: '14px' }}>Cantidad</th>
                    <th style={{ width: '180px', minWidth: '150px', fontSize: '14px' }}>Precio Unitario</th>
                    <th style={{ width: '180px', minWidth: '150px', fontSize: '14px' }}>Importe</th>
                    <th style={{ width: '80px', minWidth: '80px', fontSize: '14px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items && formData.items.map((item, index) => (
                    <tr 
                      key={index}
                      draggable={item.descripcion !== ''}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      style={{
                        cursor: item.descripcion !== '' ? 'move' : 'default',
                        backgroundColor: draggedItem === index ? '#f8f9fa' : 'transparent',
                        height: '60px'
                      }}
                    >
                      <td className="text-center" style={{ cursor: item.descripcion !== '' ? 'grab' : 'default' }}>
                        {item.descripcion !== '' && (
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
                            value={item.descripcion}
                            onChange={(e) => handleProductSearch(index, e.target.value, e)}
                            onFocus={(e) => handleProductFocus(index, e)}
                            onBlur={() => hideProductSuggestions(index)}
                            placeholder="Descripción del producto..."
                            autoComplete="off"
                            style={{ 
                              minWidth: '400px', 
                              fontSize: '15px', 
                              padding: '10px 15px',
                              height: 'auto'
                            }}
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
                          style={{ 
                            minWidth: '100px', 
                            fontSize: '15px', 
                            padding: '10px 15px',
                            height: 'auto'
                          }}
                        />
                      </td>
                      <td>
                        <Form.Control
                          type="number"
                          value={item.precioUnitario}
                          onChange={(e) => handleItemChange(index, 'precioUnitario', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          style={{ 
                            minWidth: '140px', 
                            fontSize: '15px', 
                            padding: '10px 15px',
                            height: 'auto'
                          }}
                        />
                      </td>
                      <td>
                        <div className="text-end fw-bold" style={{ 
                          padding: '10px 15px', 
                          minWidth: '140px',
                          fontSize: '15px',
                          lineHeight: '1.5'
                        }}>
                          ${(item.subtotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={formData.items?.length === 1 || (index === (formData.items?.length || 0) - 1 && item.descripcion === '')}
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
            {(!formData.items || formData.items.length === 0) && (
              <div className="text-center py-4 text-muted">
                <i className="fas fa-box-open fa-3x mb-3 text-secondary"></i>
                <p className="mb-0">No hay productos agregados.</p>
                <p className="small">Comienza escribiendo en la primera fila.</p>
              </div>
            )}
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
                      <span>Utilidad ({formData.utilidad}%):</span>
                      <span className="text-success fw-bold">+${(((formData.subtotal || 0) * (formData.utilidad || 0)) / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
        <Button variant="secondary" onClick={handleClose}>
          Cancelar
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
        >
          {editingCotizacion ? 'Actualizar' : 'Guardar'} Cotización
        </Button>
      </Modal.Footer>
      
      {/* Portal para dropdown de productos - renderizado fuera del modal */}
      {Object.keys(showProductSuggestions).some(key => showProductSuggestions[parseInt(key)]) && 
       productSuggestions.length > 0 && 
       activeRow !== null && 
       showProductSuggestions[activeRow] &&
       createPortal(
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
              onClick={() => selectProduct(activeRow, material)}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <strong>{material.tipo} - {material.material}</strong>
              {material.medida && <span> - {material.medida}</span>}<br />
              <small className="text-muted">
                Proveedor: {material.proveedor} | Precio: {material.precio?.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
              </small>
            </div>
          ))}
        </div>,
        document.body
      )}
    </Modal>
  );
};

export default CotizacionCanalizacionModal;
