import { faGripVertical, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState, useRef } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { createPortal } from 'react-dom';
import { Cliente, Cotizacion, IInventoryItem, ItemCotizacion, Proyecto, RazonSocial, Vendedor } from '../../types';

type CotizacionFormData = Omit<Cotizacion, 'fechaCreacion' | 'fechaActualizacion'> & {
  fecha: string;
  vigencia: string;
  items: ItemCotizacion[];
  iva: number;
  ivaImporte: number;
  vendedor?: string;
}

interface CotizacionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: Partial<Cotizacion>) => void;
  editingCotizacion: Cotizacion | null;
  clientes: Cliente[];
  inventarioItems: IInventoryItem[];
  razonesSociales: RazonSocial[];
  proyectos: Proyecto[];
  vendedores: Vendedor[];
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
  proyectos,
  vendedores,
  generatePresupuestoNumber
}: CotizacionModalProps): React.ReactPortal => {
  const defaultFormData: CotizacionFormData = {
    cliente: '',
    razonSocial: '',
    vendedor: '',
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
      porcentajeGanancia: 0,
      ganancia: 0,
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
  
  // Estado para la moneda
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');

  // Estados para autocompletado
  const [clienteSuggestions, setClienteSuggestions] = useState<Cliente[]>([]);
  const [showClienteSuggestions, setShowClienteSuggestions] = useState(false);
  const [razonSocialSuggestions, setRazonSocialSuggestions] = useState<RazonSocial[]>([]);
  const [showRazonSocialSuggestions, setShowRazonSocialSuggestions] = useState(false);
  const [razonSocialDisplayText, setRazonSocialDisplayText] = useState('');
  const [clienteDisplayText, setClienteDisplayText] = useState('');
  
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

  // Snapshot para detectar cambios (dirty)
  const initialSnapshotRef = useRef<string>('');

  // Función para generar número automáticamente
  const generarNumeroAutomatico = async (razonSocialId?: string, nombreEmpresa?: string) => {
    try {
      console.log('=== GENERANDO NÚMERO AUTOMÁTICO ===');
      console.log('razonSocialId:', razonSocialId);
      console.log('nombreEmpresa:', nombreEmpresa);
      
      const requestBody = razonSocialId 
        ? { razonSocial: razonSocialId }
        : { nombreEmpresa: nombreEmpresa };
        
      console.log('Enviando requestBody:', requestBody);
        
      const response = await fetch('http://localhost:6051/api/cotizaciones/generate-numero', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Número generado desde API:', data.numeroPresupuesto);
        setFormData(prev => ({ ...prev, numeroPresupuesto: data.numeroPresupuesto }));
      } else {
        const errorData = await response.text();
        console.error('Error en API response:', response.status, errorData);
        // Mostrar mensaje de error en lugar de usar fallback
        alert('Error al generar número automático. Servidor no disponible.');
      }
    } catch (error) {
      console.error('Error conectando con el servidor:', error);
      // Mostrar mensaje de error en lugar de usar fallback
      alert('No se pudo conectar con el servidor. Verifica que esté ejecutándose.');
    }
  };

  // Función para formatear moneda según la moneda seleccionada
  const formatearMoneda = (valor: number): string => {
    const locale = moneda === 'USD' ? 'en-US' : 'es-MX';
    const simbolo = '$';
    return `${simbolo}${valor.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`;
  };

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
    const newItem = {
      clave: formData.items.length + 1,
      marca: 'CANALIZACIÓN',
      modelo: canalizacion.numeroPresupuesto,
      concepto: `Canalización: ${canalizacion.numeroPresupuesto} - ${canalizacion.cliente}`,
      cantidad: 1,
      unidad: 'PZA' as const,
      precioUnitario: canalizacion.total,
      porcentajeGanancia: 0,
      ganancia: 0,
      importe: canalizacion.total,
      material: '',
      canalizacionId: canalizacion._id, // Referencia a la canalización original
      esCanalizacion: true,
      aplicarIva: false // Las canalizaciones no aplican IVA por defecto
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items.filter(item => item.concepto.trim() !== ''), newItem, {
        clave: prev.items.length + 2,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA',
        precioUnitario: 0,
        porcentajeGanancia: 0,
        ganancia: 0,
        importe: 0,
        material: '',
        esCanalizacion: false,
        aplicarIva: true
      }]
    }));

    setShowCanalizacionModal(false);
    calculateTotals();
  };

  // Función para añadir un separador visual
  const addSeparador = () => {
    const newItem: ItemCotizacion = {
      clave: formData.items.length + 1,
      marca: '',
      modelo: '',
      concepto: 'Nuevo Separador',
      cantidad: 0,
      unidad: 'PZA' as const,
      precioUnitario: 0,
      porcentajeGanancia: 0,
      ganancia: 0,
      importe: 0,
      aplicarIva: false,
      esSeparador: true
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items.filter(item => item.concepto.trim() !== '' || item.esSeparador), newItem, {
        clave: prev.items.length + 2,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA' as const,
        precioUnitario: 0,
        porcentajeGanancia: 0,
        ganancia: 0,
        importe: 0,
        aplicarIva: true,
        esSeparador: false
      }]
    }));
  };

  // Efecto para cargar datos de edición
  useEffect(() => {
    if (editingCotizacion) {
      const razonSocialObj = typeof editingCotizacion.razonSocial === 'object' ? editingCotizacion.razonSocial : null;
      setRazonSocialDisplayText(razonSocialObj?.nombre || '');
      
      // Cargar moneda si existe
      if (editingCotizacion.moneda) {
        setMoneda(editingCotizacion.moneda as 'MXN' | 'USD');
      }
      
      // Cargar display text del cliente
      const clienteObj = typeof editingCotizacion.cliente === 'object' ? editingCotizacion.cliente : null;
      if (clienteObj) {
        setClienteDisplayText(clienteObj.nombreEmpresa || '');
      } else if (typeof editingCotizacion.cliente === 'string') {
        // Si es string, buscar el cliente por _id o por nombre para mostrar
        const clienteEncontrado = clientes.find(c => c._id === editingCotizacion.cliente || c.nombreEmpresa === editingCotizacion.cliente);
        setClienteDisplayText(clienteEncontrado?.nombreEmpresa || editingCotizacion.cliente);
      }
      
      // Asegurar que los items tengan al menos una fila vacía
      let itemsToSet = editingCotizacion.items || [];
      if (itemsToSet.length === 0) {
        itemsToSet = [{
          clave: 1,
          marca: '',
          modelo: '',
          concepto: '',
          cantidad: 1,
          unidad: 'PZA' as const,
          precioUnitario: 0,
          porcentajeGanancia: 0,
          ganancia: 0,
          importe: 0,
          material: '',
          aplicarIva: true
        }];
      } else {
        // Asegurar que todos los items tengan clave correcta
        itemsToSet = itemsToSet.map((item, index) => ({
          ...item,
          clave: item.clave || index + 1
        }));
        // Asegurar fila vacía al final
        itemsToSet = ensureEmptyRow(itemsToSet);
      }
      
      const editingVendedor = (editingCotizacion as any)?.vendedor;
      const initialData = {
        ...editingCotizacion,
        fecha: editingCotizacion.fecha ? new Date(editingCotizacion.fecha).toISOString().split('T')[0] : '',
        vigencia: editingCotizacion.vigencia ? new Date(editingCotizacion.vigencia).toISOString().split('T')[0] : '',
        cliente: typeof editingCotizacion.cliente === 'string' 
          ? editingCotizacion.cliente 
          : editingCotizacion.cliente?._id || '',
        razonSocial: typeof editingCotizacion.razonSocial === 'string' 
          ? editingCotizacion.razonSocial 
          : editingCotizacion.razonSocial?._id || '',
        vendedor: typeof editingVendedor === 'string' ? editingVendedor : editingVendedor?._id || '',
        items: itemsToSet
      } as CotizacionFormData;

  setFormData(initialData as CotizacionFormData);

      // Guardar snapshot inicial para detectar si hay cambios
      const comparable = getComparableData(initialData);
      initialSnapshotRef.current = JSON.stringify(comparable);
    } else {
      // Resetear completamente el formulario para nueva cotización
      const today = new Date().toISOString().split('T')[0];
      const vigencia = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const initialData = {
        cliente: '',
        razonSocial: '',
        vendedor: '',
        numeroPresupuesto: '', // Iniciar vacío, se generará al seleccionar cliente
        fecha: today,
        vigencia: vigencia,
        items: [{
          clave: 1,
          marca: '',
          modelo: '',
          concepto: '',
          cantidad: 1,
          unidad: 'PZA' as const,
          precioUnitario: 0,
          porcentajeGanancia: 0,
          ganancia: 0,
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

  setFormData(initialData as CotizacionFormData);

      // Guardar snapshot inicial para detectar si hay cambios
      const comparable = getComparableData(initialData as CotizacionFormData);
      initialSnapshotRef.current = JSON.stringify(comparable);
      
      // Limpiar también el estado de razón social
      setRazonSocialDisplayText('');
      setClienteDisplayText('');
      setMoneda('MXN'); // Resetear moneda a MXN por defecto
      
      // Limpiar estados de autocompletado
      setClienteSuggestions([]);
      setShowClienteSuggestions(false);
      setRazonSocialSuggestions([]);
      setShowRazonSocialSuggestions(false);
      setProductSuggestions({});
      setShowProductSuggestions({});
      setActiveRow(null);
    }
  }, [editingCotizacion, generatePresupuestoNumber, show]);

  // Genera un objeto comparable (sin campos volátiles) para detectar cambios
  const getComparableData = (data: CotizacionFormData) => {
    return {
      cliente: data.cliente || '',
      razonSocial: data.razonSocial || '',
      vendedor: data.vendedor || '',
      numeroPresupuesto: data.numeroPresupuesto || '',
      fecha: data.fecha || '',
      vigencia: data.vigencia || '',
      items: (data.items || []).filter(i => i.concepto && i.concepto.trim() !== '').map(i => ({
        marca: i.marca || '',
        modelo: i.modelo || '',
        concepto: i.concepto || '',
        cantidad: i.cantidad || 0,
        unidad: i.unidad || 'PZA',
        precioUnitario: i.precioUnitario || 0,
        porcentajeGanancia: i.porcentajeGanancia || 0,
        ganancia: i.ganancia || 0,
        importe: i.importe || 0,
        aplicarIva: !!i.aplicarIva
      })),
      subtotal: data.subtotal || 0,
      iva: data.iva || 0,
      total: data.total || 0,
      estado: data.estado || '',
      comentarios: data.comentarios || ''
    };
  };

  // Determina si el formulario tiene cambios respecto al snapshot inicial
  const isFormDirty = () => {
    try {
      const current = getComparableData(formData);
      return initialSnapshotRef.current !== JSON.stringify(current);
    } catch (e) {
      return false;
    }
  };

  // Intercepta intentos de cerrar el modal y pregunta confirmación si hay cambios
  const handleRequestClose = () => {
    if (isFormDirty()) {
      const confirmExit = window.confirm('Hay cambios sin guardar en la cotización. ¿Seguro que desea salir y perder los cambios?');
      if (confirmExit) {
        onHide();
      }
    } else {
      onHide();
    }
  };

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
      moneda: moneda, // Agregar la moneda seleccionada
      items: formData.items.filter(item => item.concepto.trim() !== '' || item.esSeparador)
    };
    onSave(filteredData);
  };

  // Asegurar que siempre haya una fila vacía al final
  const ensureEmptyRow = (items: ItemCotizacion[]): ItemCotizacion[] => {
    // Verificar si el último item es una fila vacía (no separador y sin concepto)
    const lastItem = items[items.length - 1];
    const lastIsEmpty = lastItem && !lastItem.esSeparador && lastItem.concepto === '';
    
    if (items.length === 0 || !lastIsEmpty) {
      const newIndex = items.length + 1;
      return [...items, { 
        clave: newIndex,
        marca: '',
        modelo: '',
        concepto: '',
        cantidad: 1,
        unidad: 'PZA' as const,
        precioUnitario: 0,
        porcentajeGanancia: 0,
        ganancia: 0,
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
    const ivaImporte = newSubtotal * (formData.iva / 100);
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
    setClienteDisplayText(value);
    // NO guardar en formData.cliente hasta que se seleccione de la lista
    
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
    // Guardar SIEMPRE el _id, nunca el nombre
    setFormData(prev => ({ ...prev, cliente: cliente._id || '' }));
    setClienteDisplayText(cliente.nombreEmpresa);
    setShowClienteSuggestions(false);
    
    // Generar número automáticamente cuando se selecciona un cliente
    if (!editingCotizacion && cliente.nombreEmpresa) {
      generarNumeroAutomatico(undefined, cliente.nombreEmpresa);
    }
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
    
    // Generar número automáticamente cuando se selecciona una razón social
    if (!editingCotizacion && razonSocial._id) {
      generarNumeroAutomatico(razonSocial._id);
    }
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

  const handleItemChange = (index: number, name: keyof ItemCotizacion, value: any) => {
    if (name === 'material' && value) {
      // Si se está seleccionando un material del catálogo
      const selectedItem = inventarioItems.find(item => item._id === value);
      if (selectedItem) {
        setFormData(prev => {
          const newItems = [...prev.items];
          const unidad = (selectedItem.unidad === 'PZA' || selectedItem.unidad === 'MTS') ? selectedItem.unidad : 'PZA' as const;
          const cantidad = newItems[index]?.cantidad || 1;
          const porcentajeGanancia = newItems[index]?.porcentajeGanancia || 0;
          const ganancia = selectedItem.precioUnitario * (porcentajeGanancia / 100);
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
            precioUnitario: selectedItem.precioUnitario,
            porcentajeGanancia: porcentajeGanancia,
            ganancia: ganancia,
            material: value,
            cantidad,
            importe: cantidad * (selectedItem.precioUnitario + ganancia),
            aplicarIva: true
          };
          
          // Asegurar que hay una fila vacía al final
          const updatedItems = ensureEmptyRow(newItems).map((item, idx) => ({
            ...item,
            clave: idx + 1
          }));
          
          console.log('Items después de agregar producto:', updatedItems.length);
          
          return {
            ...prev,
            items: updatedItems
          };
        });
        
        // Cerrar el dropdown de sugerencias después de seleccionar
        setShowProductSuggestions(prev => ({
          ...prev,
          [index]: false
        }));
        setProductSuggestions(prev => ({
          ...prev,
          [index]: []
        }));
        
        // Recalcular totales
        setTimeout(() => calculateTotals(), 50);
      }
    } else {
      // Otros cambios de campos
      setFormData(prev => {
        const newItems = [...prev.items];
        const currentItem = newItems[index];
        const updatedItem: ItemCotizacion = {
          ...currentItem,
          [name]: value,
          unidad: currentItem.unidad || 'PZA' as const,
          clave: currentItem.clave || index + 1
        };
        
        // Mantener valores previos si no se están actualizando
        if (name !== 'porcentajeGanancia') {
          updatedItem.porcentajeGanancia = currentItem.porcentajeGanancia ?? 0;
        }
        if (name !== 'ganancia') {
          updatedItem.ganancia = currentItem.ganancia ?? 0;
        }

        // Recalcular ganancia e importe si cambia cantidad, precio o porcentaje de ganancia
        if (['cantidad', 'precioUnitario', 'porcentajeGanancia'].includes(name)) {
          const precioUnitario = Number(updatedItem.precioUnitario || 0);
          const porcentajeGanancia = Number(updatedItem.porcentajeGanancia || 0);
          const cantidad = Number(updatedItem.cantidad || 0);
          
          // Calcular ganancia por unidad
          updatedItem.ganancia = precioUnitario * (porcentajeGanancia / 100);
          
          // Calcular importe final: cantidad * (precio costo + ganancia)
          updatedItem.importe = cantidad * (precioUnitario + updatedItem.ganancia);
        }

        newItems[index] = updatedItem;

        const updatedItems = ensureEmptyRow(newItems).map((item, idx) => ({
          ...item,
          clave: idx + 1
        }));

        return {
          ...prev,
          items: updatedItems
        };
      });
      
      // Recalcular totales después de actualizar
      setTimeout(() => calculateTotals(), 50);
    }
  };

  // Función para cambiar el porcentaje de IVA
  const handleIvaChange = (nuevoIva: number) => {
    setFormData(prev => {
      const subtotal = prev.items?.reduce((sum, item) => sum + (item.importe || 0), 0) || 0;
      const subtotalConIva = prev.items?.reduce((sum, item) => sum + (item.aplicarIva ? (item.importe || 0) : 0), 0) || 0;
      const ivaImporte = subtotalConIva * (nuevoIva / 100);
      const total = subtotal + ivaImporte;
      return {
        ...prev,
        iva: nuevoIva,
        subtotal,
        ivaImporte,
        total
      };
    });
  };

  const calculateTotals = () => {
    setFormData(prev => {
      const subtotal = prev.items?.reduce((sum, item) => sum + (item.importe || 0), 0) || 0;
      // Solo calcular IVA para los items que tienen aplicarIva=true
      const subtotalConIva = prev.items?.reduce((sum, item) => sum + (item.aplicarIva ? (item.importe || 0) : 0), 0) || 0;
      const ivaImporte = subtotalConIva * (prev.iva / 100);
      const total = subtotal + ivaImporte;
      return {
        ...prev,
        subtotal,
        ivaImporte,
        total
      };
    });
  };

  return createPortal(
    <>
    <Modal
  show={show}
  onHide={handleRequestClose}
  size="xl"
  centered={false}
  backdrop="static"
  keyboard={false}
  style={{
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90vw',
    height: '90vh',
    maxWidth: '90vw',
    maxHeight: '90vh',
    margin: 0,
    zIndex: 9999
  }}
  dialogClassName="w-100 h-100 m-0 mw-100"
>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>
            {editingCotizacion ? 'Editar' : 'Nueva'} Cotización
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3" style={{ height: 'calc(100vh - 120px)', overflowY: 'auto', overflowX: 'hidden' }}>
          <Form>
            <div className="row">
              <div className="col-md-4">
                <Form.Group className="mb-2">
                  <Form.Label>Cliente</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      type="text"
                      value={clienteDisplayText}
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
                  <Form.Label>No. Cotización</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.numeroPresupuesto}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroPresupuesto: e.target.value }))}
                    placeholder="Selecciona un cliente para generar"
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

            <div className="row mb-2">
              <div className="col-md-4">
                <Form.Group className="mb-2">
                  <Form.Label>Vendedor</Form.Label>
                  <Form.Select
                    name="vendedor"
                    value={typeof formData.vendedor === 'string' ? formData.vendedor : ''}
                    onChange={handleChange}
                  >
                    <option value="">Seleccionar vendedor</option>
                    {vendedores && vendedores.map(v => (
                      <option key={v._id} value={v._id}>{v.nombre || v._id}</option>
                    ))}
                  </Form.Select>
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
                  Productos en la Cotización
                </h5>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-secondary"
                    onClick={addSeparador}
                  >
                    <i className="fas fa-minus me-2"></i>
                    Crear Separador
                  </Button>
                  <Button 
                    variant="outline-primary"
                    onClick={() => setShowCanalizacionModal(true)}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Añadir Canalización
                  </Button>
                </div>
              </div>

              {/* Modal de búsqueda de canalizaciones */}
              {/* {console.log('Renderizando modal con showCanalizacionModal:', showCanalizacionModal)} */}
              <Modal 
                show={showCanalizacionModal}
                onHide={() => setShowCanalizacionModal(false)}
                size="lg"
                style={{ zIndex: 9999 }}
                backdrop="static"
              >
                <Modal.Header closeButton>
                  <Modal.Title>Buscar Canalización</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form.Group className="mb-3">
                    <Form.Control
                      type="text"
                      placeholder="Buscar por comentario, número de presupuesto o cliente..."
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
                            <th>Total</th>
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
                <table className="table table-striped table-hover mb-0" style={{ minWidth: '1600px', fontSize: '13px' }}>
                  <thead className="table-dark" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '30px' }}>⋮⋮</th>
                      <th style={{ width: '50px' }}>CLAVE</th>
                      <th style={{ width: '100px', minWidth: '90px' }}>MARCA</th>
                      <th style={{ width: '120px', minWidth: '100px' }}>MODELO</th>
                      <th style={{ width: '200px', minWidth: '180px' }}>CONCEPTO</th>
                      <th style={{ width: '60px', minWidth: '50px' }}>U</th>
                      <th style={{ width: '70px', minWidth: '60px' }}>CANT</th>
                      <th style={{ width: '110px', minWidth: '100px' }}>P.U (Costo)</th>
                      <th style={{ width: '70px', minWidth: '60px' }}>% GAN</th>
                      <th style={{ width: '100px', minWidth: '90px' }}>GANANCIA</th>
                      <th style={{ width: '120px', minWidth: '110px' }}>IMPORTE</th>
                      <th style={{ width: '40px' }}>IVA</th>
                      <th style={{ width: '60px' }}>Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items && formData.items.map((item, index) => (
                      item.esSeparador ? (
                        // Fila de separador
                        <tr 
                          key={index}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          style={{
                            cursor: 'move',
                            backgroundColor: draggedItem === index ? '#1a4a8a' : '#0F2A52'
                          }}
                        >
                          <td className="text-center" style={{ cursor: 'grab', backgroundColor: '#0F2A52' }}>
                            <FontAwesomeIcon 
                              icon={faGripVertical} 
                              className="text-white"
                              title="Arrastrar para reordenar"
                            />
                          </td>
                          <td colSpan={11} style={{ backgroundColor: '#0F2A52', padding: '8px 12px' }}>
                            <div className="d-flex align-items-center justify-content-between">
                              <Form.Control
                                type="text"
                                value={item.concepto || ''}
                                onChange={(e) => handleItemChange(index, 'concepto', e.target.value)}
                                placeholder="Nombre del separador..."
                                style={{ 
                                  fontSize: '14px', 
                                  fontWeight: 'bold',
                                  padding: '6px 12px', 
                                  backgroundColor: 'transparent',
                                  border: '1px solid rgba(255,255,255,0.3)',
                                  color: 'white',
                                  maxWidth: '400px'
                                }}
                                className="separator-input"
                              />
                              <Button
                                variant="outline-light"
                                size="sm"
                                onClick={() => handleRemoveItem(index)}
                                title="Eliminar separador"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        // Fila normal de producto
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
                              style={{ fontSize: '12px', padding: '4px 6px', minWidth: '80px' }}
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
                                      const updatedItem: ItemCotizacion = {
                                        ...formData.items[index],
                                        marca: suggestion.marca,
                                        modelo: suggestion.modelo,
                                        concepto: suggestion.descripcion,
                                        unidad: (suggestion.unidad === 'PZA' || suggestion.unidad === 'MTS') ? suggestion.unidad as 'PZA' | 'MTS' : 'PZA',
                                        precioUnitario: suggestion.precioUnitario,
                                        material: suggestion._id,
                                        importe: (formData.items[index].cantidad || 1) * suggestion.precioUnitario,
                                        aplicarIva: true
                                      };
                                      setFormData(prev => {
                                        const newItems = prev.items.map((item, i) => 
                                          i === index ? updatedItem : item
                                        );
                                        const itemsConFilaVacia = ensureEmptyRow(newItems);
                                        return {
                                          ...prev,
                                          items: itemsConFilaVacia
                                        };
                                      });
                                      setShowProductSuggestions(prev => ({
                                        ...prev,
                                        [index]: false
                                      }));
                                      setTimeout(() => calculateTotals(), 100);
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
                              style={{ fontSize: '12px', padding: '4px 6px', minWidth: '90px' }}
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
                                      const porcentajeGanancia = formData.items[index].porcentajeGanancia || 0;
                                      const ganancia = suggestion.precioUnitario * (porcentajeGanancia / 100);
                                      const updatedItem: ItemCotizacion = {
                                        ...formData.items[index],
                                        marca: suggestion.marca,
                                        modelo: suggestion.modelo,
                                        concepto: suggestion.descripcion,
                                        unidad: (suggestion.unidad === 'PZA' || suggestion.unidad === 'MTS') ? suggestion.unidad as 'PZA' | 'MTS' : 'PZA',
                                        precioUnitario: suggestion.precioUnitario,
                                        porcentajeGanancia: porcentajeGanancia,
                                        ganancia: ganancia,
                                        material: suggestion._id,
                                        importe: (formData.items[index].cantidad || 1) * (suggestion.precioUnitario + ganancia),
                                        aplicarIva: true
                                      };
                                      setFormData(prev => {
                                        const newItems = prev.items.map((item, i) => 
                                          i === index ? updatedItem : item
                                        );
                                        const itemsConFilaVacia = ensureEmptyRow(newItems);
                                        return {
                                          ...prev,
                                          items: itemsConFilaVacia
                                        };
                                      });
                                      setShowProductSuggestions(prev => ({
                                        ...prev,
                                        [index]: false
                                      }));
                                      setTimeout(() => calculateTotals(), 100);
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
                              style={{ fontSize: '12px', padding: '4px 6px', minWidth: '160px' }}
                            />
                            {showProductSuggestions[index] && productSuggestions[index]?.length > 0 && (
                              <div className="position-absolute w-100 bg-white border rounded shadow-sm" 
                                   style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                {productSuggestions[index].map((suggestion) => (
                                  <div
                                    key={suggestion._id}
                                    className="p-2 border-bottom cursor-pointer hover-bg-light"
                                    onClick={() => {
                                      // Actualizar todos los campos del item con la información del producto seleccionado
                                      const porcentajeGanancia = formData.items[index].porcentajeGanancia || 0;
                                      const ganancia = suggestion.precioUnitario * (porcentajeGanancia / 100);
                                      const updatedItem: ItemCotizacion = {
                                        ...formData.items[index],
                                        marca: suggestion.marca,
                                        modelo: suggestion.modelo,
                                        concepto: suggestion.descripcion,
                                        unidad: suggestion.unidad as 'PZA' | 'MTS',
                                        precioUnitario: suggestion.precioUnitario,
                                        porcentajeGanancia: porcentajeGanancia,
                                        ganancia: ganancia,
                                        material: suggestion._id,
                                        importe: (formData.items[index].cantidad || 1) * (suggestion.precioUnitario + ganancia),
                                        aplicarIva: true
                                      };
                                      
                                      setFormData(prev => {
                                        const newItems = prev.items.map((item, i) => 
                                          i === index ? updatedItem : item
                                        );
                                        const itemsConFilaVacia = ensureEmptyRow(newItems);
                                        return {
                                          ...prev,
                                          items: itemsConFilaVacia
                                        };
                                      });
                                      
                                      setShowProductSuggestions(prev => ({
                                        ...prev,
                                        [index]: false
                                      }));
                                      
                                      calculateTotals();
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
                            style={{ fontSize: '12px', padding: '4px 6px', minWidth: '50px' }}
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
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(index, 'cantidad', val === '' ? '' : parseFloat(val) || 0);
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '' || parseFloat(e.target.value) === 0) {
                                handleItemChange(index, 'cantidad', 1);
                              }
                            }}                            min="1"
                            step="1"
                            style={{ fontSize: '12px', padding: '4px 6px', minWidth: '60px' }}
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="number"
                            value={item.precioUnitario}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(index, 'precioUnitario', val === '' ? '' : parseFloat(val) || 0);
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '') {
                                handleItemChange(index, 'precioUnitario', 0);
                              }
                            }}                            min="0"
                            step="0.01"
                            style={{ fontSize: '12px', padding: '4px 6px', minWidth: '90px' }}
                          />
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            inputMode="numeric"
                            value={item.porcentajeGanancia ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Solo permitir números y punto decimal
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                handleItemChange(index, 'porcentajeGanancia', val === '' ? '' : parseFloat(val) || 0);
                              }
                            }}
                            onBlur={(e) => {
                              if (e.target.value === '') {
                                handleItemChange(index, 'porcentajeGanancia', 0);
                              }
                            }}
                            style={{ fontSize: '12px', padding: '4px 6px', minWidth: '50px', textAlign: 'right' }}
                            title="Porcentaje de ganancia"
                          />
                        </td>
                        <td>
                          <span className="text-success" style={{ fontSize: '12px', padding: '4px 6px', display: 'block', minWidth: '80px', textAlign: 'right' }}>${(item.ganancia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            inputMode="decimal"
                            value={item.importe ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              // Permitir borrar completamente y solo números/decimales (incluyendo valores parciales como "123.")
                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                // Si es vacío o termina en punto, solo guardar el valor sin calcular
                                if (val === '' || val.endsWith('.')) {
                                  setFormData(prev => {
                                    const newItems = [...prev.items];
                                    newItems[index] = {
                                      ...newItems[index],
                                      importe: val as any // Guardar como string temporalmente
                                    };
                                    return { ...prev, items: newItems };
                                  });
                                  return;
                                }
                                
                                const nuevoImporte = parseFloat(val) || 0;
                                const cantidad = Number(item.cantidad || 1);
                                const precioUnitario = Number(item.precioUnitario || 0);
                                
                                // Calcular ganancia por unidad inversa (puede ser negativa temporalmente)
                                const precioVentaUnitario = nuevoImporte / cantidad;
                                const nuevaGanancia = precioVentaUnitario - precioUnitario;
                                
                                // Calcular porcentaje de ganancia
                                const nuevoPorcentaje = precioUnitario > 0 
                                  ? (nuevaGanancia / precioUnitario) * 100 
                                  : 0;
                                
                                // Actualizar todos los campos relacionados
                                setFormData(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = {
                                    ...newItems[index],
                                    importe: nuevoImporte,
                                    ganancia: nuevaGanancia,
                                    porcentajeGanancia: Math.round(nuevoPorcentaje * 100) / 100
                                  };
                                  return { ...prev, items: newItems };
                                });
                                setTimeout(() => calculateTotals(), 50);
                              }
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const cantidad = Number(item.cantidad || 1);
                              const precioUnitario = Number(item.precioUnitario || 0);
                              const importeMinimo = precioUnitario * cantidad;
                              
                              // Si el importe es menor al mínimo, restaurar al mínimo y recalcular
                              if (val < importeMinimo) {
                                setFormData(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = {
                                    ...newItems[index],
                                    importe: importeMinimo,
                                    ganancia: 0,
                                    porcentajeGanancia: 0
                                  };
                                  return { ...prev, items: newItems };
                                });
                                setTimeout(() => calculateTotals(), 50);
                              } else {
                                // Asegurar que el valor sea número al salir del campo
                                setFormData(prev => {
                                  const newItems = [...prev.items];
                                  newItems[index] = {
                                    ...newItems[index],
                                    importe: val
                                  };
                                  return { ...prev, items: newItems };
                                });
                              }
                            }}
                            style={{ fontSize: '12px', padding: '4px 6px', minWidth: '100px', textAlign: 'right', fontWeight: 'bold' }}
                            title={`Mínimo: $${(Number(item.precioUnitario || 0) * Number(item.cantidad || 1)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                          />
                        </td>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={item.aplicarIva}
                            onChange={(e) => handleItemChange(index, 'aplicarIva', e.target.checked)}
                            disabled={item.esCanalizacion}
                            title={item.esCanalizacion ? 'No se puede aplicar IVA a canalizaciones' : 'Aplicar IVA a este producto'}
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
                      )
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
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">
                        <i className="fas fa-calculator me-2"></i>
                        Resumen de Totales
                      </h6>
                      <div className="btn-group btn-group-sm" role="group">
                        <button
                          type="button"
                          className={`btn ${moneda === 'MXN' ? 'btn-light' : 'btn-outline-light'}`}
                          onClick={() => setMoneda('MXN')}
                        >
                          MXN
                        </button>
                        <button
                          type="button"
                          className={`btn ${moneda === 'USD' ? 'btn-light' : 'btn-outline-light'}`}
                          onClick={() => setMoneda('USD')}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="d-flex justify-content-between py-2 border-bottom">
                        <span>Subtotal:</span>
                        <span className="fw-bold">{formatearMoneda(formData.subtotal || 0)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div className="d-flex flex-column">
                          <span className="mb-1">IVA:</span>
                          <div className="btn-group btn-group-sm" role="group">
                            <button
                              type="button"
                              className={`btn btn-sm ${formData.iva === 0 ? 'btn-info' : 'btn-outline-info'}`}
                              onClick={() => handleIvaChange(0)}
                            >
                              0%
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${formData.iva === 8 ? 'btn-info' : 'btn-outline-info'}`}
                              onClick={() => handleIvaChange(8)}
                            >
                              8%
                            </button>
                            <button
                              type="button"
                              className={`btn btn-sm ${formData.iva === 16 ? 'btn-info' : 'btn-outline-info'}`}
                              onClick={() => handleIvaChange(16)}
                            >
                              16%
                            </button>
                          </div>
                        </div>
                        <span className="text-info fw-bold">{formatearMoneda(formData.ivaImporte || 0)}</span>
                      </div>
                      <div className="d-flex justify-content-between py-3 bg-light rounded mt-2">
                        <span className="fw-bold text-primary">Total:</span>
                        <span className="fw-bold text-primary fs-5">{formatearMoneda(formData.total || 0)}</span>
                      </div>
                      {/* Ganancia total - Solo visible en el modal, no en PDF */}
                      <div className="d-flex justify-content-between py-2 mt-2 border-top" style={{ backgroundColor: '#e8f5e9' }}>
                        <span className="text-success">
                          <i className="fas fa-chart-line me-2"></i>
                          Ganancia Total:
                        </span>
                        <span className="fw-bold text-success">
                          {formatearMoneda(
                            formData.items
                              ?.filter(item => !item.esSeparador)
                              .reduce((sum, item) => sum + ((item.ganancia || 0) * (item.cantidad || 0)), 0) || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Form>

          <div className="d-flex justify-content-end gap-2 mt-3">
            <Button variant="secondary" onClick={handleRequestClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingCotizacion ? 'Actualizar' : 'Guardar'} Cotización
            </Button>
          </div>
        </Modal.Body>

      </Modal>
    </>,
    document.body
  );
};

export default CotizacionModal;