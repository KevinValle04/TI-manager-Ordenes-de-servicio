import { faChevronDown, faChevronRight, faGripVertical, faLayerGroup, faTrash } from '@fortawesome/free-solid-svg-icons';
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
    comentariosInternos: '',
    comentariosPdf: '',
    mostrarContenidoConceptos: false
  };

  // Estados del formulario
  const [formData, setFormData] = useState<CotizacionFormData>(defaultFormData);
  
  // Estado para la moneda
  const [moneda, setMoneda] = useState<'MXN' | 'USD'>('MXN');
  
  // Estado para mostrar contenido de conceptos en PDF
  const [mostrarContenidoConceptos, setMostrarContenidoConceptos] = useState(false);

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

  // Estados para la funcionalidad de Crear Concepto
  const [modoCrearConcepto, setModoCrearConcepto] = useState(false);
  const [itemsSeleccionadosConcepto, setItemsSeleccionadosConcepto] = useState<Set<number>>(new Set());
  const [showNombreConceptoModal, setShowNombreConceptoModal] = useState(false);
  const [nombreConceptoNuevo, setNombreConceptoNuevo] = useState('');
  const [conceptosExpandidos, setConceptosExpandidos] = useState<Set<number>>(new Set());

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
        
      const response = await fetch('/api/cotizaciones/generate-numero', {
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

  // Función para iniciar el modo de crear concepto
  const iniciarModoCrearConcepto = () => {
    setModoCrearConcepto(true);
    setItemsSeleccionadosConcepto(new Set());
  };

  // Función para cancelar el modo de crear concepto
  const cancelarModoCrearConcepto = () => {
    setModoCrearConcepto(false);
    setItemsSeleccionadosConcepto(new Set());
    setNombreConceptoNuevo('');
  };

  // Función para seleccionar/deseleccionar un item para el concepto
  const toggleSeleccionItem = (index: number) => {
    setItemsSeleccionadosConcepto(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Función para confirmar la selección y pedir el nombre del concepto
  const confirmarSeleccionConcepto = () => {
    if (itemsSeleccionadosConcepto.size === 0) {
      alert('Selecciona al menos un artículo para crear el concepto.');
      return;
    }
    setShowNombreConceptoModal(true);
  };

  // Función para crear el concepto agrupado
  const crearConceptoAgrupado = () => {
    if (!nombreConceptoNuevo.trim()) {
      alert('Ingresa un nombre para el concepto.');
      return;
    }

    const indicesSeleccionados = Array.from(itemsSeleccionadosConcepto).sort((a, b) => a - b);
    // Guardar tanto el item como su índice original
    const itemsConIndices = indicesSeleccionados
      .map(i => ({ item: formData.items[i], indiceOriginal: i }))
      .filter(({ item }) => item && !item.esSeparador && !item.esConceptoAgrupado);
    const itemsParaAgrupar = itemsConIndices.map(({ item }) => item);
    
    if (itemsParaAgrupar.length === 0) {
      alert('No hay artículos válidos seleccionados.');
      return;
    }

    // Calcular el importe total de los items agrupados
    const importeTotal = itemsParaAgrupar.reduce((sum, item) => sum + (item.importe || 0), 0);
    // Calcular si alguno aplica IVA
    const aplicaIva = itemsParaAgrupar.some(item => item.aplicarIva);

    // Crear el nuevo item de concepto agrupado
    const conceptoAgrupado: ItemCotizacion = {
      clave: formData.items.length + 1,
      marca: '',
      modelo: '',
      concepto: nombreConceptoNuevo.trim(),
      cantidad: 1,
      unidad: 'LOTE' as const,
      precioUnitario: importeTotal,
      porcentajeGanancia: 0,
      ganancia: 0,
      importe: importeTotal,
      aplicarIva: aplicaIva,
      esConceptoAgrupado: true,
      nombreConceptoAgrupado: nombreConceptoNuevo.trim(),
      itemsAgrupados: itemsConIndices.map(({ item, indiceOriginal }) => ({
        ...item,
        indiceOriginalAntesDeConcept: indiceOriginal
      }))
    };

    // Encontrar la posición del primer item seleccionado
    const primerIndiceSeleccionado = Math.min(...Array.from(itemsSeleccionadosConcepto));
    
    // Filtrar los items que no fueron seleccionados (mantenerlos) y la fila vacía
    const itemsNoSeleccionados = formData.items.filter((item, index) => {
      // No incluir items seleccionados
      if (itemsSeleccionadosConcepto.has(index)) return false;
      // No incluir filas vacías (se agregarán después)
      if (!item.concepto || item.concepto.trim() === '') return false;
      return true;
    });

    // Crear el array final insertando el concepto en la posición del primer item seleccionado
    const nuevosItems: ItemCotizacion[] = [];
    let contadorNoSeleccionados = 0;
    
    for (let i = 0; i < formData.items.length; i++) {
      if (i === primerIndiceSeleccionado) {
        // Insertar el concepto agrupado en esta posición
        nuevosItems.push(conceptoAgrupado);
      }
      
      // Si el item actual no fue seleccionado y no es una fila vacía, agregarlo
      if (!itemsSeleccionadosConcepto.has(i) && 
          formData.items[i].concepto && 
          formData.items[i].concepto.trim() !== '') {
        nuevosItems.push(itemsNoSeleccionados[contadorNoSeleccionados]);
        contadorNoSeleccionados++;
      }
    }
    
    // Si el concepto aún no se ha insertado (por si acaso), agregarlo al final
    if (!nuevosItems.includes(conceptoAgrupado)) {
      nuevosItems.push(conceptoAgrupado);
    }
    
    const itemsConFilaVacia = ensureEmptyRow(nuevosItems).map((item, idx) => ({
      ...item,
      clave: idx + 1
    }));

    setFormData(prev => ({
      ...prev,
      items: itemsConFilaVacia
    }));

    // Expandir automáticamente el nuevo concepto
    setConceptosExpandidos(prev => {
      const newSet = new Set(prev);
      newSet.add(itemsConFilaVacia.findIndex(item => item.esConceptoAgrupado && item.nombreConceptoAgrupado === nombreConceptoNuevo.trim()));
      return newSet;
    });

    // Limpiar estados
    setModoCrearConcepto(false);
    setItemsSeleccionadosConcepto(new Set());
    setNombreConceptoNuevo('');
    setShowNombreConceptoModal(false);

    // Recalcular totales
    setTimeout(() => calculateTotals(), 50);
  };

  // Función para expandir/colapsar un concepto agrupado
  const toggleConceptoExpandido = (index: number) => {
    setConceptosExpandidos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Función para desagrupar un concepto (volver a mostrar los items individuales)
  const desagruparConcepto = (index: number) => {
    const conceptoAgrupado = formData.items[index];
    if (!conceptoAgrupado.esConceptoAgrupado || !conceptoAgrupado.itemsAgrupados) return;

    const itemsDesagrupados = conceptoAgrupado.itemsAgrupados.map(item => ({
      ...item,
      esConceptoAgrupado: false,
      itemsAgrupados: undefined,
      nombreConceptoAgrupado: undefined,
      indiceOriginalAntesDeConcept: undefined
    }));

    // Verificar si los items tienen índice original guardado
    const tienenIndiceOriginal = conceptoAgrupado.itemsAgrupados.some(
      item => item.indiceOriginalAntesDeConcept !== undefined
    );

    let nuevosItems: ItemCotizacion[];

    if (tienenIndiceOriginal) {
      // Restaurar items en sus posiciones originales
      // Primero, obtener todos los items actuales excepto el concepto y filas vacías
      const itemsActuales = formData.items
        .filter((item, i) => i !== index && item.concepto && item.concepto.trim() !== '');
      
      // Crear un mapa de índices originales a items desagrupados
      const itemsPorIndice = new Map<number, ItemCotizacion>();
      conceptoAgrupado.itemsAgrupados.forEach((item, i) => {
        const indiceOriginal = item.indiceOriginalAntesDeConcept ?? 0;
        itemsPorIndice.set(indiceOriginal, itemsDesagrupados[i]);
      });
      
      // Reconstruir el array insertando items en sus posiciones originales
      const maxIndice = Math.max(
        ...itemsActuales.map((_, i) => i),
        ...Array.from(itemsPorIndice.keys())
      );
      
      nuevosItems = [];
      let contadorItemsActuales = 0;
      
      for (let i = 0; i <= maxIndice + itemsDesagrupados.length; i++) {
        if (itemsPorIndice.has(i)) {
          // Insertar item desagrupado en su posición original
          nuevosItems.push(itemsPorIndice.get(i)!);
        } else if (contadorItemsActuales < itemsActuales.length) {
          // Insertar item actual
          nuevosItems.push(itemsActuales[contadorItemsActuales]);
          contadorItemsActuales++;
        }
      }
      
      // Agregar items actuales restantes
      while (contadorItemsActuales < itemsActuales.length) {
        nuevosItems.push(itemsActuales[contadorItemsActuales]);
        contadorItemsActuales++;
      }
    } else {
      // Comportamiento anterior: insertar en la posición del concepto
      const itemsAnteriores = formData.items.slice(0, index);
      const itemsPosteriores = formData.items.slice(index + 1).filter(item => item.concepto && item.concepto.trim() !== '');
      nuevosItems = [...itemsAnteriores, ...itemsDesagrupados, ...itemsPosteriores];
    }

    const itemsConFilaVacia = ensureEmptyRow(nuevosItems).map((item, idx) => ({
      ...item,
      clave: idx + 1
    }));

    setFormData(prev => ({
      ...prev,
      items: itemsConFilaVacia
    }));

    setTimeout(() => calculateTotals(), 50);
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
      
      // Cargar mostrarContenidoConceptos si existe
      if (editingCotizacion.mostrarContenidoConceptos !== undefined) {
        setMostrarContenidoConceptos(editingCotizacion.mostrarContenidoConceptos);
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
        // Asegurar que todos los items tengan clave correcta y preservar campos de concepto agrupado
        itemsToSet = itemsToSet.map((item, index) => ({
          ...item,
          clave: item.clave || index + 1,
          // Preservar campos de concepto agrupado
          esConceptoAgrupado: item.esConceptoAgrupado || false,
          nombreConceptoAgrupado: item.nombreConceptoAgrupado || '',
          itemsAgrupados: item.itemsAgrupados || undefined
        }));
        // Asegurar fila vacía al final
        itemsToSet = ensureEmptyRow(itemsToSet);
      }

      // Expandir automáticamente los conceptos agrupados existentes
      const indicesConceptosAgrupados = new Set<number>();
      itemsToSet.forEach((item, index) => {
        if (item.esConceptoAgrupado) {
          indicesConceptosAgrupados.add(index);
        }
      });
      setConceptosExpandidos(indicesConceptosAgrupados);
      
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
      setMostrarContenidoConceptos(false); // Resetear checkbox
      
      // Limpiar estados de autocompletado
      setClienteSuggestions([]);
      setShowClienteSuggestions(false);
      setRazonSocialSuggestions([]);
      setShowRazonSocialSuggestions(false);
      setProductSuggestions({});
      setShowProductSuggestions({});
      setActiveRow(null);
      
      // Limpiar estados de crear concepto
      setModoCrearConcepto(false);
      setItemsSeleccionadosConcepto(new Set());
      setNombreConceptoNuevo('');
      setShowNombreConceptoModal(false);
      setConceptosExpandidos(new Set());
    }
  }, [editingCotizacion, generatePresupuestoNumber, show]);

  // Debug: Ver vendedores cargados
  useEffect(() => {
    console.log('=== DEBUG VENDEDORES ===');
    console.log('Total vendedores recibidos:', vendedores?.length || 0);
    if (vendedores && vendedores.length > 0) {
      console.log('Primer vendedor:', vendedores[0]);
      console.log('Campos disponibles:', Object.keys(vendedores[0]));
    }
    console.log('=======================');
  }, [vendedores]);

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
      comentariosInternos: data.comentariosInternos || '',
      comentariosPdf: data.comentariosPdf || ''
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
      mostrarContenidoConceptos: mostrarContenidoConceptos, // Agregar flag de mostrar contenido
      items: formData.items.filter(item => item.concepto.trim() !== '' || item.esSeparador || item.esConceptoAgrupado)
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
          const ganancia = Math.round(selectedItem.precioUnitario * (porcentajeGanancia / 100) * 100) / 100;
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
            importe: Math.round(cantidad * (selectedItem.precioUnitario + ganancia) * 100) / 100,
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
          
          // Calcular ganancia por unidad y redondear a 2 decimales
          updatedItem.ganancia = Math.round(precioUnitario * (porcentajeGanancia / 100) * 100) / 100;
          
          // Calcular importe final: cantidad * (precio costo + ganancia) y redondear a 2 decimales
          updatedItem.importe = Math.round(cantidad * (precioUnitario + updatedItem.ganancia) * 100) / 100;
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
        <Modal.Body className="px-4 py-3" style={{ overflowY: 'auto', overflowX: 'hidden' }}>
          <Form>
            {/* Checkbox para mostrar contenido de conceptos en PDF */}
            <div className="row mb-2">
              <div className="col-12">
                <Form.Check
                  type="checkbox"
                  id="mostrarContenidoConceptos"
                  label="Mostrar contenido de Conceptos en PDF"
                  checked={mostrarContenidoConceptos}
                  onChange={(e) => setMostrarContenidoConceptos(e.target.checked)}
                  title="Si está marcado, los artículos dentro de cada concepto se listarán en el PDF (sin mostrar precio unitario ni importe individual)"
                />
              </div>
            </div>

            {/* Fila 1: Cliente, Razón Social, No. Cotización */}
            <div className="row mb-2">
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Cliente</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      size="sm"
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
              <div className="col-md-5">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Razón Social</Form.Label>
                  <div className="position-relative">
                    <Form.Control
                      size="sm"
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
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>No. Cotización</Form.Label>
                  <Form.Control
                    size="sm"
                    type="text"
                    value={formData.numeroPresupuesto}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroPresupuesto: e.target.value }))}
                    placeholder="Automático"
                  />
                </Form.Group>
              </div>
            </div>

            {/* Fila 2: Vigencia, Vendedor, Estado, Proyecto */}
            <div className="row mb-2">
              <div className="col-md-2">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Vigencia</Form.Label>
                  <Form.Control
                    size="sm"
                    type="date"
                    name="vigencia"
                    value={typeof formData.vigencia === 'string' ? formData.vigencia : ''}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
              </div>
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Vendedor</Form.Label>
                  <Form.Select
                    size="sm"
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
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Estado</Form.Label>
                  <Form.Select
                    size="sm"
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
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Proyecto <small className="text-muted">(Opc.)</small></Form.Label>
                  <Form.Select
                    size="sm"
                    name="proyecto"
                    value={typeof formData.proyecto === 'string' ? formData.proyecto : formData.proyecto?._id || ''}
                    onChange={handleChange}
                  >
                    <option value="">Sin proyecto</option>
                    {proyectos.map(proyecto => (
                      <option key={proyecto._id} value={proyecto._id}>
                        {proyecto.nombre}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            {/* Fila 3: Comentarios Internos y Comentarios PDF */}
            <div className="row mb-2">
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Comentarios <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>Internos</span></Form.Label>
                  <Form.Control
                    size="sm"
                    as="textarea"
                    rows={2}
                    name="comentariosInternos"
                    value={formData.comentariosInternos || ''}
                    onChange={handleChange}
                    placeholder="Notas internas (solo visible en la lista)..."
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label className="mb-1" style={{ fontSize: '0.85rem' }}>Comentarios <span className="badge bg-primary" style={{ fontSize: '0.7rem' }}>PDF</span></Form.Label>
                  <Form.Control
                    size="sm"
                    as="textarea"
                    rows={2}
                    name="comentariosPdf"
                    value={formData.comentariosPdf || ''}
                    onChange={handleChange}
                    placeholder="Comentarios que aparecerán en el PDF..."
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
                    disabled={modoCrearConcepto}
                  >
                    <i className="fas fa-minus me-2"></i>
                    Crear Separador
                  </Button>
                  {!modoCrearConcepto ? (
                    <Button 
                      variant="outline-success"
                      onClick={iniciarModoCrearConcepto}
                    >
                      <FontAwesomeIcon icon={faLayerGroup} className="me-2" />
                      Crear Concepto
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="success"
                        onClick={confirmarSeleccionConcepto}
                        disabled={itemsSeleccionadosConcepto.size === 0}
                      >
                        <i className="fas fa-check me-2"></i>
                        Confirmar Concepto ({itemsSeleccionadosConcepto.size})
                      </Button>
                      <Button 
                        variant="outline-danger"
                        onClick={cancelarModoCrearConcepto}
                      >
                        <i className="fas fa-times me-2"></i>
                        Cancelar
                      </Button>
                    </>
                  )}
                  <Button 
                    variant="outline-primary"
                    onClick={() => setShowCanalizacionModal(true)}
                    disabled={modoCrearConcepto}
                  >
                    <i className="fas fa-plus me-2"></i>
                    Añadir Canalización
                  </Button>
                </div>
              </div>

              {/* Mensaje informativo cuando está en modo crear concepto */}
              {modoCrearConcepto && (
                <div className="alert alert-info mb-3">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Modo Crear Concepto:</strong> Selecciona los artículos que deseas agrupar marcando las casillas de la columna "SEL". 
                  Luego presiona "Confirmar Concepto" para asignarles un nombre.
                </div>
              )}

              {/* Modal para ingresar el nombre del concepto */}
              <Modal 
                show={showNombreConceptoModal}
                onHide={() => setShowNombreConceptoModal(false)}
                size="lg"
                centered
                style={{ zIndex: 10000 }}
                backdrop="static"
              >
                <Modal.Header closeButton>
                  <Modal.Title>
                    <FontAwesomeIcon icon={faLayerGroup} className="me-2 text-success" />
                    Nombre del Concepto
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form.Group>
                    <Form.Label>Ingresa el nombre para este concepto agrupado:</Form.Label>
                    <Form.Control
                      type="text"
                      value={nombreConceptoNuevo}
                      onChange={(e) => setNombreConceptoNuevo(e.target.value)}
                      placeholder="Ej: Suministros de oficina, Kit de herramientas..."
                      autoFocus
                    />
                    <Form.Text className="text-muted">
                      Este nombre aparecerá en el PDF englobando los {itemsSeleccionadosConcepto.size} artículos seleccionados.
                    </Form.Text>
                  </Form.Group>
                  <div className="mt-3">
                    <strong>Artículos a agrupar:</strong>
                    <ul className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {Array.from(itemsSeleccionadosConcepto).sort((a, b) => a - b).map(idx => {
                        const item = formData.items[idx];
                        return item ? (
                          <li key={idx}>
                            {item.concepto} - ${(item.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </li>
                        ) : null;
                      })}
                    </ul>
                    <div className="border-top pt-2 mt-2">
                      <strong>Importe total del concepto: </strong>
                      <span className="text-success fw-bold">
                        ${Array.from(itemsSeleccionadosConcepto).reduce((sum, idx) => {
                          const item = formData.items[idx];
                          return sum + (item?.importe || 0);
                        }, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowNombreConceptoModal(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    variant="success" 
                    onClick={crearConceptoAgrupado}
                    disabled={!nombreConceptoNuevo.trim()}
                  >
                    <FontAwesomeIcon icon={faLayerGroup} className="me-2" />
                    Crear Concepto
                  </Button>
                </Modal.Footer>
              </Modal>

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
                overflowX: 'auto', 
                border: '1px solid #dee2e6',
                borderRadius: '0.25rem'
              }}>
                <table className="table table-striped table-hover mb-0" style={{ minWidth: modoCrearConcepto ? '1650px' : '1600px', fontSize: '13px' }}>
                  <thead className="table-dark" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      {modoCrearConcepto && (
                        <th style={{ width: '40px', backgroundColor: '#28a745' }}>SEL</th>
                      )}
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
                          draggable={!modoCrearConcepto}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          style={{
                            cursor: modoCrearConcepto ? 'default' : 'move',
                            backgroundColor: draggedItem === index ? '#1a4a8a' : '#0F2A52'
                          }}
                        >
                          {modoCrearConcepto && (
                            <td style={{ backgroundColor: '#0F2A52' }}>
                              {/* Los separadores no se pueden seleccionar */}
                            </td>
                          )}
                          <td className="text-center" style={{ cursor: modoCrearConcepto ? 'default' : 'grab', backgroundColor: '#0F2A52' }}>
                            {!modoCrearConcepto && (
                              <FontAwesomeIcon 
                                icon={faGripVertical} 
                                className="text-white"
                                title="Arrastrar para reordenar"
                              />
                            )}
                          </td>
                          <td colSpan={modoCrearConcepto ? 11 : 11} style={{ backgroundColor: '#0F2A52', padding: '8px 12px' }}>
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
                      ) : item.esConceptoAgrupado ? (
                        // Fila de concepto agrupado (expandible)
                        <React.Fragment key={`concepto-${index}`}>
                          <tr 
                            draggable={!modoCrearConcepto}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            style={{
                              backgroundColor: draggedItem === index ? '#c3e6cb' : '#d4edda',
                              cursor: modoCrearConcepto ? 'default' : 'move'
                            }}
                          >
                            {modoCrearConcepto && (
                              <td style={{ backgroundColor: '#d4edda' }}>
                                {/* Los conceptos agrupados no se pueden seleccionar */}
                              </td>
                            )}
                            <td 
                              className="text-center" 
                              style={{ backgroundColor: '#d4edda', cursor: modoCrearConcepto ? 'default' : 'grab' }}
                            >
                              {!modoCrearConcepto && (
                                <FontAwesomeIcon 
                                  icon={faGripVertical} 
                                  className="text-success"
                                  title="Arrastrar para reordenar"
                                />
                              )}
                            </td>
                            <td 
                              style={{ backgroundColor: '#d4edda', cursor: 'pointer', width: '40px' }}
                              onClick={() => toggleConceptoExpandido(index)}
                            >
                              <FontAwesomeIcon 
                                icon={conceptosExpandidos.has(index) ? faChevronDown : faChevronRight} 
                                className="text-success"
                                title={conceptosExpandidos.has(index) ? 'Contraer' : 'Expandir'}
                              />
                            </td>
                            <td colSpan={2} style={{ backgroundColor: '#d4edda' }}>
                              <span className="badge bg-success me-2">
                                <FontAwesomeIcon icon={faLayerGroup} className="me-1" />
                                CONCEPTO
                              </span>
                              <span className="text-muted small">({item.itemsAgrupados?.length || 0} artículos)</span>
                            </td>
                            <td style={{ backgroundColor: '#d4edda' }}>
                              <Form.Control
                                type="text"
                                value={item.nombreConceptoAgrupado || item.concepto || ''}
                                onChange={(e) => {
                                  const nuevoNombre = e.target.value;
                                  setFormData(prev => {
                                    const newItems = [...prev.items];
                                    newItems[index] = {
                                      ...newItems[index],
                                      nombreConceptoAgrupado: nuevoNombre,
                                      concepto: nuevoNombre
                                    };
                                    return { ...prev, items: newItems };
                                  });
                                }}
                                style={{ fontSize: '12px', padding: '4px 6px', fontWeight: 'bold', backgroundColor: '#fff' }}
                              />
                            </td>
                            <td style={{ backgroundColor: '#d4edda' }}>LOTE</td>
                            <td style={{ backgroundColor: '#d4edda' }}>1</td>
                            <td style={{ backgroundColor: '#d4edda' }}>-</td>
                            <td style={{ backgroundColor: '#d4edda' }}>-</td>
                            <td style={{ backgroundColor: '#d4edda' }}>-</td>
                            <td style={{ backgroundColor: '#d4edda' }}>
                              <span className="fw-bold text-success" style={{ fontSize: '13px' }}>
                                ${(item.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </td>
                            <td style={{ backgroundColor: '#d4edda' }}>
                              <Form.Check
                                type="checkbox"
                                checked={item.aplicarIva}
                                onChange={(e) => handleItemChange(index, 'aplicarIva', e.target.checked)}
                              />
                            </td>
                            <td style={{ backgroundColor: '#d4edda' }}>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-warning"
                                  size="sm"
                                  onClick={() => desagruparConcepto(index)}
                                  title="Desagrupar concepto"
                                >
                                  <i className="fas fa-object-ungroup"></i>
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleRemoveItem(index)}
                                  title="Eliminar concepto"
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {/* Filas de items agrupados (solo visibles cuando está expandido) */}
                          {conceptosExpandidos.has(index) && item.itemsAgrupados?.map((subItem, subIndex) => (
                            <tr 
                              key={`${index}-sub-${subIndex}`}
                              style={{ backgroundColor: '#f0f9f0' }}
                            >
                              {modoCrearConcepto && <td style={{ backgroundColor: '#f0f9f0' }}></td>}
                              <td style={{ backgroundColor: '#f0f9f0', paddingLeft: '30px' }}>
                                <span className="text-muted">└</span>
                              </td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subIndex + 1}</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subItem.marca || '-'}</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subItem.modelo || '-'}</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subItem.concepto}</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subItem.unidad}</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subItem.cantidad}</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">
                                ${(subItem.precioUnitario || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">{subItem.porcentajeGanancia}%</td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">
                                ${(subItem.ganancia || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                              </td>
                              <td style={{ backgroundColor: '#f0f9f0' }} className="text-muted small">
                                ${(subItem.importe || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ backgroundColor: '#f0f9f0' }}>
                                {subItem.aplicarIva ? '✓' : '-'}
                              </td>
                              <td style={{ backgroundColor: '#f0f9f0' }}></td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ) : (
                        // Fila normal de producto
                        <tr 
                          key={index}
                          draggable={item.concepto !== '' && !modoCrearConcepto}
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          style={{
                            cursor: item.concepto !== '' && !modoCrearConcepto ? 'move' : 'default',
                            backgroundColor: draggedItem === index ? '#f8f9fa' : 
                              (itemsSeleccionadosConcepto.has(index) ? '#d4edda' : 'transparent')
                          }}
                        >
                        {/* Columna de selección para crear concepto */}
                        {modoCrearConcepto && (
                          <td className="text-center" style={{ backgroundColor: itemsSeleccionadosConcepto.has(index) ? '#d4edda' : 'transparent' }}>
                            {item.concepto && item.concepto.trim() !== '' && !item.esSeparador && !item.esConceptoAgrupado && (
                              <Form.Check
                                type="checkbox"
                                checked={itemsSeleccionadosConcepto.has(index)}
                                onChange={() => toggleSeleccionItem(index)}
                                style={{ cursor: 'pointer' }}
                              />
                            )}
                          </td>
                        )}
                        <td className="text-center" style={{ cursor: item.concepto !== '' && !modoCrearConcepto ? 'grab' : 'default' }}>
                          {item.concepto !== '' && !modoCrearConcepto && (
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