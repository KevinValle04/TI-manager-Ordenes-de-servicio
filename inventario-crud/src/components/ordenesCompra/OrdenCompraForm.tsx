import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Col,
  Form,
  ListGroup,
  Modal,
  Row
} from "react-bootstrap";
import { Proveedor, RazonSocial } from "../../types";
import ModalResultados from "./ModalResultados";

interface OrdenCompraFormProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: any) => void;
  editId?: string | null;
  onOrdenCreada?: () => void; // Nueva prop para notificar cuando se crea una orden
}

const OrdenCompraForm: React.FC<OrdenCompraFormProps> = ({ show, onHide, editId, onOrdenCreada }) => {
  // Estados del formulario
  const [numeroOrden, setNumeroOrden] = useState("");
  
  // Estados para proveedor
  const [proveedorBusqueda, setProveedorBusqueda] = useState("");
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [proveedoresSugerencias, setProveedoresSugerencias] = useState<Proveedor[]>([]);
  const [mostrarSugerenciasProveedor, setMostrarSugerenciasProveedor] = useState(false);
  
  // Estados para razón social
  const [razonSocialBusqueda, setRazonSocialBusqueda] = useState("");
  const [razonSocialSeleccionada, setRazonSocialSeleccionada] = useState<RazonSocial | null>(null);
  const [razonesSocialesSugerencias, setRazonesSocialesSugerencias] = useState<RazonSocial[]>([]);
  const [mostrarSugerenciasRazonSocial, setMostrarSugerenciasRazonSocial] = useState(false);
  
  // Estado para archivo PDF
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  
  // Estado para generación de número de orden
  const [generandoNumero, setGenerandoNumero] = useState(false);
  
  // Estado para dirección de envío seleccionada
  const [direccionEnvioSeleccionada, setDireccionEnvioSeleccionada] = useState<number | null>(null);
  
  // Estados para procesamiento y modal de resultados
  const [mostrarModalResultados, setMostrarModalResultados] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [datosOrdenCompletos, setDatosOrdenCompletos] = useState<any>(null);
  const [errorProcesamiento, setErrorProcesamiento] = useState<string | null>(null);
  
  // Estados para productos editables y totales
  const [productosEditables, setProductosEditables] = useState<any[]>([]);
  const [totalesCalculados, setTotalesCalculados] = useState({
    subTotal: 0,
    iva: 0,
    total: 0
  });
  
  const urlServer = import.meta.env.VITE_API_URL;

  // Funciones helper para generar número de orden
  const extraerLetrasProveedor = (nombreEmpresa: string): string => {
    const letras = nombreEmpresa.replace(/[^A-Za-z]/g, '').toUpperCase();
    return letras.substring(0, 3).padEnd(3, 'X');
  };

  const extraerLetrasRFC = (rfc: string): string => {
    const letras = rfc.replace(/[^A-Za-z]/g, '').toUpperCase();
    return letras.substring(0, 4).padEnd(4, 'X');
  };

  const obtenerSiguienteConsecutivo = async (prefijo: string): Promise<string> => {
    try {
      const response = await axios.get(`${urlServer}ordenes-compra/`);
      const responseData = response.data as any;
      const ordenes = (responseData?.data || responseData) as any[];
      
      const ordenesConPrefijo = ordenes.filter((orden: any) => 
        orden.numeroOrden && orden.numeroOrden.startsWith(prefijo)
      );

      if (ordenesConPrefijo.length === 0) {
        return 'A001';
      }

      const consecutivos = ordenesConPrefijo
        .map((orden: any) => {
          const match = orden.numeroOrden.match(/([A-Z])(\d{3})$/);
          return match ? { letra: match[1], numero: parseInt(match[2]) } : null;
        })
        .filter((cons: any) => cons !== null)
        .sort((a: any, b: any) => {
          if (a.letra === b.letra) {
            return b.numero - a.numero;
          }
          return b.letra.charCodeAt(0) - a.letra.charCodeAt(0);
        });

      if (consecutivos.length === 0) {
        return 'A001';
      }

      const ultimo = consecutivos[0];
      
      if (!ultimo) {
        return 'A001';
      }
      
      if (ultimo.numero >= 999) {
        const siguienteLetra = String.fromCharCode(ultimo.letra.charCodeAt(0) + 1);
        return `${siguienteLetra}001`;
      } else {
        const siguienteNumero = ultimo.numero + 1;
        return `${ultimo.letra}${siguienteNumero.toString().padStart(3, '0')}`;
      }
    } catch (error) {
      console.error('Error al obtener consecutivo:', error);
      return 'A001';
    }
  };

  const generarNumeroOrden = async (proveedor: Proveedor, razonSocial: RazonSocial): Promise<string> => {
    const letrasProveedor = extraerLetrasProveedor(proveedor.empresa);
    const letrasRFC = extraerLetrasRFC(razonSocial.rfc);
    const prefijo = `${letrasProveedor}-${letrasRFC}-`;
    
    const consecutivo = await obtenerSiguienteConsecutivo(prefijo);
    return `${prefijo}${consecutivo}`;
  };

  // Cargar proveedores
  const buscarProveedores = async (termino: string) => {
    if (termino.length < 2) {
      setProveedoresSugerencias([]);
      return;
    }
    
    try {
      const response = await axios.get<Proveedor[]>(`${urlServer}proveedores/`);
      const filtered = response.data.filter(proveedor =>
        proveedor.empresa.toLowerCase().includes(termino.toLowerCase())
      );
      setProveedoresSugerencias(filtered.slice(0, 5));
    } catch (error) {
      console.error("Error al buscar proveedores:", error);
      setProveedoresSugerencias([]);
    }
  };

  // Cargar razones sociales
  const buscarRazonesSociales = async (termino: string) => {
    if (termino.length < 2) {
      setRazonesSocialesSugerencias([]);
      return;
    }
    
    try {
      const response = await axios.get<RazonSocial[]>(`${urlServer}razones-sociales/`);
      const filtered = response.data.filter(razonSocial =>
        razonSocial.nombre.toLowerCase().includes(termino.toLowerCase()) ||
        razonSocial.rfc.toLowerCase().includes(termino.toLowerCase())
      );
      setRazonesSocialesSugerencias(filtered.slice(0, 5));
    } catch (error) {
      console.error("Error al buscar razones sociales:", error);
      setRazonesSocialesSugerencias([]);
    }
  };

  // Efectos para búsqueda
  useEffect(() => {
    if (proveedorBusqueda) {
      buscarProveedores(proveedorBusqueda);
    }
  }, [proveedorBusqueda]);

  useEffect(() => {
    if (razonSocialBusqueda) {
      buscarRazonesSociales(razonSocialBusqueda);
    }
  }, [razonSocialBusqueda]);

  // Efecto para cargar datos cuando se edita una orden
  useEffect(() => {
    const cargarDatosOrden = async () => {
      if (editId && show) {
        try {
          const response = await axios.get(`${urlServer}ordenes-compra/${editId}`);
          const orden: any = response.data;
          
          // Cargar datos básicos
          setNumeroOrden(orden.numeroOrden || '');
          
          // Cargar proveedor
          if (typeof orden.proveedor === 'object') {
            setProveedorSeleccionado(orden.proveedor);
            setProveedorBusqueda(orden.proveedor.empresa || '');
          }
          
          // Cargar razón social
          if (typeof orden.razonSocial === 'object') {
            setRazonSocialSeleccionada(orden.razonSocial);
            setRazonSocialBusqueda(orden.razonSocial.nombre || '');
            
            // Si hay direcciones de envío, seleccionar la primera por defecto
            if (orden.razonSocial.direccionEnvio && orden.razonSocial.direccionEnvio.length > 0) {
              // Buscar la dirección que coincida con la guardada en datosOrden
              let indiceSeleccionado = 0;
              if (orden.datosOrden?.direccionEnvio?.indice !== undefined) {
                indiceSeleccionado = orden.datosOrden.direccionEnvio.indice;
              }
              setDireccionEnvioSeleccionada(indiceSeleccionado);
            }
          }
          
          // Si hay productos en datosOrden, cargarlos y mostrar modal de resultados
          if (orden.datosOrden?.productos && orden.datosOrden.productos.length > 0) {
            setProductosEditables(orden.datosOrden.productos);
            
            // Si hay totales, cargarlos
            if (orden.datosOrden?.totalesCalculados) {
              setTotalesCalculados(orden.datosOrden.totalesCalculados);
            }
            
            // Cargar datos completos para el modal
            setDatosOrdenCompletos({
              numeroOrden: orden.numeroOrden,
              fecha: orden.fecha,
              proveedor: orden.proveedor,
              razonSocial: orden.razonSocial,
              vendedor: orden.vendedor,
              direccionEnvio: orden.datosOrden.direccionEnvio,
              datosPdf: orden.datosOrden.datosPdf,
              pdfInfo: orden.datosOrden.datosPdf,
              fechaProcesamiento: orden.createdAt
            });
            
            // Mostrar modal de resultados para edición
            setMostrarModalResultados(true);
          }
          
        } catch (error) {
          console.error('Error al cargar datos de la orden:', error);
          setErrorProcesamiento('Error al cargar los datos de la orden para edición');
        }
      } else if (!editId && show) {
        // Limpiar formulario para nueva orden
        resetearFormulario();
      }
    };

    cargarDatosOrden();
  }, [editId, show]);

  // Función para resetear el formulario
  const resetearFormulario = () => {
    setNumeroOrden('');
    // No establecer fecha por defecto
    setProveedorBusqueda('');
    setProveedorSeleccionado(null);
    setRazonSocialBusqueda('');
    setRazonSocialSeleccionada(null);
    setArchivoPdf(null);
    setDireccionEnvioSeleccionada(null);
    setProductosEditables([]);
    setTotalesCalculados({ subTotal: 0, iva: 0, total: 0 });
    setDatosOrdenCompletos(null);
    setErrorProcesamiento(null);
    setMostrarModalResultados(false);
  };

  // Manejar cambio en búsqueda de proveedor
  const handleProveedorBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setProveedorBusqueda(valor);
    setMostrarSugerenciasProveedor(true);
    
    if (!valor) {
      setProveedorSeleccionado(null);
      setProveedoresSugerencias([]);
      if (numeroOrden) {
        setNumeroOrden("");
      }
    }
  };

  // Manejar selección de proveedor
  const handleProveedorSeleccion = async (proveedor: Proveedor) => {
    setProveedorSeleccionado(proveedor);
    setProveedorBusqueda(proveedor.empresa);
    setMostrarSugerenciasProveedor(false);
    setProveedoresSugerencias([]);
    
    if (razonSocialSeleccionada) {
      try {
        setGenerandoNumero(true);
        const numeroGenerado = await generarNumeroOrden(proveedor, razonSocialSeleccionada);
        setNumeroOrden(numeroGenerado);
      } catch (error) {
        console.error('Error al generar número de orden:', error);
      } finally {
        setGenerandoNumero(false);
      }
    }
  };

  // Manejar Enter en proveedor
  const handleProveedorKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && proveedoresSugerencias.length > 0) {
      e.preventDefault();
      handleProveedorSeleccion(proveedoresSugerencias[0]);
    }
  };

  // Manejar cambio en búsqueda de razón social
  const handleRazonSocialBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value;
    setRazonSocialBusqueda(valor);
    setMostrarSugerenciasRazonSocial(true);
    
    if (!valor) {
      setRazonSocialSeleccionada(null);
      setRazonesSocialesSugerencias([]);
      if (numeroOrden) {
        setNumeroOrden("");
      }
      setDireccionEnvioSeleccionada(null);
    }
  };

  // Manejar selección de razón social
  const handleRazonSocialSeleccion = async (razonSocial: RazonSocial) => {
    setRazonSocialSeleccionada(razonSocial);
    setRazonSocialBusqueda(razonSocial.nombre);
    setMostrarSugerenciasRazonSocial(false);
    setRazonesSocialesSugerencias([]);
    
    // Seleccionar automáticamente la primera dirección de envío si existe
    if (razonSocial.direccionEnvio && razonSocial.direccionEnvio.length > 0) {
      setDireccionEnvioSeleccionada(0);
    } else {
      setDireccionEnvioSeleccionada(null);
    }
    
    if (proveedorSeleccionado) {
      try {
        setGenerandoNumero(true);
        const numeroGenerado = await generarNumeroOrden(proveedorSeleccionado, razonSocial);
        setNumeroOrden(numeroGenerado);
      } catch (error) {
        console.error('Error al generar número de orden:', error);
      } finally {
        setGenerandoNumero(false);
      }
    }
  };

  // Manejar Enter en razón social
  const handleRazonSocialKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && razonesSocialesSugerencias.length > 0) {
      e.preventDefault();
      handleRazonSocialSeleccion(razonesSocialesSugerencias[0]);
    }
  };

  // Manejar cambio de archivo PDF
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setArchivoPdf(file);
    } else {
      alert('Por favor seleccione un archivo PDF válido');
      e.target.value = '';
    }
  };

  // Procesar orden completa
  const procesarOrden = async () => {
    // Validaciones básicas
    if (!numeroOrden.trim()) {
      alert('El número de orden es requerido');
      return;
    }
    
    if (!proveedorSeleccionado) {
      alert('Debe seleccionar un proveedor');
      return;
    }
    
    if (!razonSocialSeleccionada) {
      alert('Debe seleccionar una razón social');
      return;
    }

    if (!archivoPdf) {
      alert('Debe seleccionar un archivo PDF');
      return;
    }

    setProcesando(true);
    setErrorProcesamiento(null);

    try {
      // Preparar datos básicos de la orden
      const datosBasicos = {
        numeroOrden,
        proveedor: {
          id: proveedorSeleccionado._id,
          empresa: proveedorSeleccionado.empresa,
          direccion: proveedorSeleccionado.direccion,
          telefono: proveedorSeleccionado.telefono,
          contactos: proveedorSeleccionado.contactos
        },
        razonSocial: {
          id: razonSocialSeleccionada._id,
          nombre: razonSocialSeleccionada.nombre,
          rfc: razonSocialSeleccionada.rfc,
          emailEmpresa: razonSocialSeleccionada.emailEmpresa,
          telEmpresa: razonSocialSeleccionada.telEmpresa,
          direccionEmpresa: razonSocialSeleccionada.direccionEmpresa,
          emailFacturacion: razonSocialSeleccionada.emailFacturacion
        },
        vendedor: null, // Se seleccionará en el modal de resultados
        direccionEnvio: direccionEnvioSeleccionada !== null ? {
          indice: direccionEnvioSeleccionada,
          ...razonSocialSeleccionada.direccionEnvio[direccionEnvioSeleccionada]
        } : null
      };

      // Procesar PDF según el proveedor
      const datosPdf = await procesarPdfSegunProveedor(archivoPdf, proveedorSeleccionado.empresa);

      // Combinar todos los datos
      const datosCompletos = {
        ...datosBasicos,
        pdfInfo: {
          nombre: archivoPdf.name,
          tamaño: archivoPdf.size,
          tipo: archivoPdf.type
        },
        datosPdf: datosPdf,
        fechaProcesamiento: new Date().toISOString()
      };

      setDatosOrdenCompletos(datosCompletos);
      
      // Inicializar productos editables
      inicializarProductosEditables(datosPdf);
      
      setMostrarModalResultados(true);

    } catch (error) {
      console.error('Error al procesar orden:', error);
      setErrorProcesamiento(error instanceof Error ? error.message : 'Error desconocido al procesar la orden');
    } finally {
      setProcesando(false);
    }
  };

  // Crear orden directamente desde PDF con detección automática del proveedor
  const crearOrdenDesdePdf = async (pdf: File, proveedorId: string, razonSocialId: string, vendedorId?: string): Promise<any> => {
    const formData = new FormData();
    formData.append('pdf', pdf);
    formData.append('proveedor', proveedorId);
    formData.append('razonSocial', razonSocialId);
    if (vendedorId) {
      formData.append('vendedor', vendedorId);
    }
    if (direccionEnvioSeleccionada !== null && razonSocialSeleccionada?.direccionEnvio[direccionEnvioSeleccionada]) {
      formData.append('direccionEnvio', JSON.stringify({
        indice: direccionEnvioSeleccionada,
        ...razonSocialSeleccionada.direccionEnvio[direccionEnvioSeleccionada]
      }));
    }

    try {
      const response = await axios.post(`${urlServer}ordenes-compra/crear-desde-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error al crear orden desde PDF:', error);
      throw new Error('Error al crear la orden desde el archivo PDF. Verifique que el archivo sea válido y que el proveedor sea compatible.');
    }
  };

  // Procesar PDF según el proveedor
  const procesarPdfSegunProveedor = async (pdf: File, empresaProveedor: string): Promise<any> => {
    const formData = new FormData();
    formData.append('pdf', pdf);
    formData.append('proveedor', empresaProveedor);

    try {
      const response = await axios.post(`${urlServer}ordenes-compra/procesar-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error al procesar PDF:', error);
      throw new Error('Error al procesar el archivo PDF. Verifique que el archivo sea válido.');
    }
  };

  // Volver al formulario desde el modal de resultados
  const volverAlFormulario = () => {
    setMostrarModalResultados(false);
    setDatosOrdenCompletos(null);
    setErrorProcesamiento(null);
  };

  // Función auxiliar para parsear valores numéricos con formato de moneda
  const parseNumericValue = (value: any): number => {
    if (typeof value === 'number') return value || 0;
    if (typeof value === 'string') {
      // Remover comas, espacios, símbolos de moneda y convertir a número
      const cleanValue = value.replace(/[$,\s]/g, '').trim();
      const parsed = parseFloat(cleanValue);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  // Funciones para manejo de productos editables
  const inicializarProductosEditables = (datosPdf: any) => {
    // Los productos están en datosPdf.datosExtraidos.productos
    if (datosPdf && datosPdf.datosExtraidos && datosPdf.datosExtraidos.productos) {
      console.log(' Productos del PDF (primeros 3):', datosPdf.datosExtraidos.productos.slice(0, 3));
      
      const productos = datosPdf.datosExtraidos.productos.map((producto: any, index: number) => {
        const cantidad = parseNumericValue(producto.cantidad);
        const precioUnitario = parseNumericValue(producto.precioUnitario) || 
                              parseNumericValue(producto.precioLista) || 
                              parseNumericValue(producto.precio) ||
                              parseNumericValue(producto.precioNeto) ||
                              0;
        const importeOriginal = parseNumericValue(producto.importe) || 
                               parseNumericValue(producto.total) ||
                               parseNumericValue(producto.subtotal) ||
                               0;
        
        // Calcular importe si no está disponible
        const importe = importeOriginal || (cantidad * precioUnitario);

        const productoMapeado = {
          cantidad: cantidad,
          clave: producto.codigo || producto.codigoFabricante || '',
          descripcion: producto.descripcion || '',
          precioUnitario: precioUnitario,
          unidad: producto.unidad || '',
          almacen: producto.alm || '',
          precioLista: parseNumericValue(producto.precioLista),
          descuento: parseNumericValue(producto.descuento),
          importe: importe
        };
        
        // Log solo productos con problemas de precio
        if (precioUnitario === 0 && index < 5) {
          console.log(`⚠️ Producto ${index + 1} sin precio:`, {
            original: producto,
            mapeado: productoMapeado
          });
        }
        
        return productoMapeado;
      });
      
      setProductosEditables(productos);
      
      // Usar totales del PDF si están disponibles, sino calcular automáticamente
      if (datosPdf.datosExtraidos.totales) {
        setTotalesCalculados({
          subTotal: parseNumericValue(datosPdf.datosExtraidos.totales.subTotal || datosPdf.datosExtraidos.totales.Subtotal),
          iva: parseNumericValue(datosPdf.datosExtraidos.totales.iva || datosPdf.datosExtraidos.totales.IVA || datosPdf.datosExtraidos.totales['IVA (16%)']),
          total: parseNumericValue(datosPdf.datosExtraidos.totales.total || datosPdf.datosExtraidos.totales.Total)
        });
      } else {
        // Calcular totales automáticamente si no están en el PDF
        calcularTotales(productos);
      }
    } else {
      // Si no hay productos, inicializar arrays vacíos
      setProductosEditables([]);
      setTotalesCalculados({ subTotal: 0, iva: 0, total: 0 });
    }
  };

  const calcularTotales = useCallback((productos: any[]) => {
    const subTotal = productos.reduce((sum, producto) => {
      // Usar el importe del PDF si está disponible, sino calcularlo
      const importe = producto.importe || ((producto.cantidad || 0) * (producto.precioUnitario || 0));
      return sum + importe;
    }, 0);
    
    // Detectar el porcentaje de IVA basado en los totales actuales
    let porcentajeIva = 0.16; // 16% por defecto
    if (totalesCalculados.subTotal > 0 && totalesCalculados.iva > 0) {
      porcentajeIva = totalesCalculados.iva / totalesCalculados.subTotal;
    }
    
    const iva = subTotal * porcentajeIva;
    const total = subTotal + iva;
    
    const nuevosTotales = {
      subTotal: Number(subTotal.toFixed(2)),
      iva: Number(iva.toFixed(2)),
      total: Number(total.toFixed(2))
    };
    
    // Solo actualizar si los totales han cambiado significativamente
    if (
      Math.abs(nuevosTotales.subTotal - totalesCalculados.subTotal) > 0.01 ||
      Math.abs(nuevosTotales.iva - totalesCalculados.iva) > 0.01 ||
      Math.abs(nuevosTotales.total - totalesCalculados.total) > 0.01
    ) {
      setTotalesCalculados(nuevosTotales);
    }
  }, [totalesCalculados]);

  // Función optimizada para actualizar productos con useCallback
  const actualizarProducto = useCallback((index: number, campo: string, valor: any) => {
    setProductosEditables(prev => {
      const nuevosProductos = [...prev];
      nuevosProductos[index] = {
        ...nuevosProductos[index],
        [campo]: valor
      };
      
      // Calcular totales directamente con los nuevos productos
      calcularTotales(nuevosProductos);
      
      return nuevosProductos;
    });
  }, [calcularTotales]);

  // Función para agregar producto optimizada
  const agregarNuevoProducto = useCallback(() => {
    const nuevoProducto = {
      clave: '',
      descripcion: '',
      cantidad: 0,
      unidad: 'PIEZA',
      precioUnitario: 0
    };
    setProductosEditables(prev => {
      const nuevosProductos = [...prev, nuevoProducto];
      calcularTotales(nuevosProductos);
      return nuevosProductos;
    });
  }, [calcularTotales]);

  // Función para generar la orden de compra con PDF
  const generarOrdenCompra = async (datosOrden: any) => {
    try {
      let response;
      
      if (editId) {
        // Modo edición: actualizar orden existente con regeneración de PDF
        response = await axios.put(`${urlServer}ordenes-compra/${editId}/actualizar-con-pdf`, datosOrden, {
          responseType: 'blob', // Para recibir el PDF como blob
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } else {
        // Modo creación: crear nueva orden
        response = await axios.post(`${urlServer}ordenes-compra/crear-con-pdf`, datosOrden, {
          responseType: 'blob', // Para recibir el PDF como blob
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }

      // Crear URL para descargar el PDF
      const blob = new Blob([response.data as BlobPart], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `OrdenCompra-${datosOrden.numeroOrden || 'nueva'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar URL
      window.URL.revokeObjectURL(url);
      
      // Obtener información de la orden creada desde el header (si existe)
      const ordenId = response.headers['x-orden-id'];
      if (ordenId) {
        console.log('Orden creada con ID:', ordenId);
      }
      
      // Mostrar mensaje de éxito
      const mensaje = editId 
        ? 'Orden de compra actualizada exitosamente. El PDF se ha descargado automáticamente.'
        : 'Orden de compra generada exitosamente. El PDF se ha descargado automáticamente.';
      alert(mensaje);
      
      // Notificar al componente padre que se creó una nueva orden
      if (onOrdenCreada) {
        onOrdenCreada();
      }
      
      // Cerrar modales y resetear formulario
      setMostrarModalResultados(false);
      onHide();
      resetearFormulario();
      
    } catch (error) {
      console.error('Error al generar orden de compra:', error);

    }
  };

  // Crear orden directamente desde PDF (sin modal intermedio)
  const crearOrdenDirectamenteDesdePdf = async () => {
    // Validaciones básicas
    if (!proveedorSeleccionado) {
      alert('Debe seleccionar un proveedor');
      return;
    }
    
    if (!razonSocialSeleccionada) {
      alert('Debe seleccionar una razón social');
      return;
    }

    if (!archivoPdf) {
      alert('Debe seleccionar un archivo PDF');
      return;
    }

    setProcesando(true);
    setErrorProcesamiento(null);

    try {
      // Crear orden directamente desde PDF usando la nueva funcionalidad
      const resultado = await crearOrdenDesdePdf(
        archivoPdf,
        proveedorSeleccionado._id ?? "",
        razonSocialSeleccionada._id ?? "",
        undefined // El vendedor se seleccionará en el modal de resultados
      );

      // Mostrar mensaje de éxito
      alert(`¡Orden de compra creada exitosamente!\n\nDetalles:\n- Orden: ${resultado.orden?.numeroOrden}\n- Productos extraídos: ${resultado.datosExtraidos?.productos?.length || 0}\n- Total: $${resultado.datosExtraidos?.totales?.total?.toFixed(2) || '0.00'}`);
      
      // Notificar al componente padre que se creó una nueva orden
      if (onOrdenCreada) {
        onOrdenCreada();
      }
      
      // Cerrar modal y resetear formulario
      onHide();
      resetearFormulario();
      
    } catch (error) {
      console.error('Error al crear orden desde PDF:', error);
      setErrorProcesamiento(error instanceof Error ? error.message : 'Error desconocido al crear la orden');
    } finally {
      setProcesando(false);
    }
  };

  // Función para cancelar y cerrar el modal de resultados
  const cancelarProcesamiento = () => {
    setMostrarModalResultados(false);
    resetearFormulario();
    onHide();
  };

  return (
    <>
      {/* Modal principal del formulario */}
      <Modal show={show && !mostrarModalResultados} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>{editId ? "Editar Orden de Compra" : "Nueva Orden de Compra"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Form>
            {/* Información básica */}
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Número de Orden *
                    <small className="text-muted ms-2">
                      (Auto-generado, editable)
                    </small>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={numeroOrden}
                    onChange={(e) => setNumeroOrden(e.target.value)}
                    placeholder="Se generará automáticamente al seleccionar proveedor y razón social"
                    required
                  />
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    {proveedorSeleccionado && razonSocialSeleccionada && (
                      <>
                        <Form.Text className="text-success">
                          <i className="fas fa-info-circle me-1"></i>
                          Formato: {extraerLetrasProveedor(proveedorSeleccionado.empresa)}-{extraerLetrasRFC(razonSocialSeleccionada.rfc)}-[Consecutivo]
                        </Form.Text>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          disabled={generandoNumero}
                          onClick={async () => {
                            try {
                              setGenerandoNumero(true);
                              const numeroGenerado = await generarNumeroOrden(proveedorSeleccionado, razonSocialSeleccionada);
                              setNumeroOrden(numeroGenerado);
                            } catch (error) {
                              console.error('Error al regenerar número:', error);
                              alert('Error al generar nuevo número de orden');
                            } finally {
                              setGenerandoNumero(false);
                            }
                          }}
                        >
                          {generandoNumero ? (
                            <>
                              <i className="fas fa-spinner fa-spin me-1"></i>
                              Generando...
                            </>
                          ) : (
                            <>
                              <i className="fas fa-sync me-1"></i>
                              Regenerar
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </Form.Group>
              </Col>
            </Row>

            {/* Secciones de Proveedor y Razón Social lado a lado */}
            <Row className="mb-4">
              {/* Sección de Proveedor */}
              <Col md={6}>
                <div className="h-100 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                  <h6 className="text-primary mb-3">Seleccionar Proveedor</h6>
                  <Form.Group className="mb-3">
                    <Form.Label>Buscar Proveedor *</Form.Label>
                    <Form.Control
                      type="text"
                      value={proveedorBusqueda}
                      onChange={handleProveedorBusquedaChange}
                      onKeyDown={handleProveedorKeyDown}
                      placeholder="Escriba el nombre del proveedor"
                      required
                    />
                    {mostrarSugerenciasProveedor && proveedoresSugerencias.length > 0 && (
                      <ListGroup className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {proveedoresSugerencias.map((proveedor) => (
                          <ListGroup.Item
                            key={proveedor._id}
                            action
                            onClick={() => handleProveedorSeleccion(proveedor)}
                            style={{ cursor: 'pointer' }}
                          >
                            <strong>{proveedor.empresa}</strong>
                            <br />
                            <small className="text-muted">
                              {proveedor.direccion} - {proveedor.telefono}
                            </small>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </Form.Group>

                  {proveedorSeleccionado && (
                    <Alert variant="success" className="mb-0 small">
                      <strong>Proveedor Seleccionado:</strong>
                      <br />
                      <strong>Empresa:</strong> {proveedorSeleccionado.empresa}
                      <br />
                      <strong>Dirección:</strong> {proveedorSeleccionado.direccion}
                      <br />
                      <strong>Teléfono:</strong> {proveedorSeleccionado.telefono}
                      {proveedorSeleccionado.contactos.length > 0 && (
                        <>
                          <br />
                          <strong>Contactos:</strong>
                          <div className="mt-1">
                            {proveedorSeleccionado.contactos.map((contacto, index) => (
                              <Badge key={index} bg="info" className="me-1 mt-1 small">
                                {contacto.nombre}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </Alert>
                  )}
                </div>
              </Col>

              {/* Sección de Razón Social */}
              <Col md={6}>
                <div className="h-100 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                  <h6 className="text-primary mb-3">Seleccionar Razón Social</h6>
                  <Form.Group className="mb-3">
                    <Form.Label>Buscar Razón Social *</Form.Label>
                    <Form.Control
                      type="text"
                      value={razonSocialBusqueda}
                      onChange={handleRazonSocialBusquedaChange}
                      onKeyDown={handleRazonSocialKeyDown}
                      placeholder="Escriba el nombre o RFC"
                      required
                    />
                    {mostrarSugerenciasRazonSocial && razonesSocialesSugerencias.length > 0 && (
                      <ListGroup className="mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {razonesSocialesSugerencias.map((razonSocial) => (
                          <ListGroup.Item
                            key={razonSocial._id}
                            action
                            onClick={() => handleRazonSocialSeleccion(razonSocial)}
                            style={{ cursor: 'pointer' }}
                          >
                            <strong>{razonSocial.nombre}</strong>
                            <br />
                            <small className="text-muted">
                              RFC: {razonSocial.rfc} - {razonSocial.emailEmpresa}
                            </small>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </Form.Group>

                  {razonSocialSeleccionada && (
                    <Alert variant="success" className="mb-0 small">
                      <strong>Razón Social Seleccionada:</strong>
                      <br />
                      <strong>Nombre:</strong> {razonSocialSeleccionada.nombre}
                      <br />
                      <strong>RFC:</strong> {razonSocialSeleccionada.rfc}
                      <br />
                      <strong>Email:</strong> {razonSocialSeleccionada.emailEmpresa}
                      <br />
                      <strong>Teléfono:</strong> {razonSocialSeleccionada.telEmpresa}
                      <br />
                      <strong>Dirección de Facturación:</strong> {razonSocialSeleccionada.direccionEmpresa}
                      {direccionEnvioSeleccionada !== null && (
                        <>
                          <br />
                          <strong>Dirección de Envío:</strong> {razonSocialSeleccionada.direccionEnvio[direccionEnvioSeleccionada].nombre}
                          <Badge bg="info" className="ms-2 small">Seleccionada por defecto</Badge>
                        </>
                      )}
                    </Alert>
                  )}
                </div>
              </Col>
            </Row>

            {/* Sección de carga de PDF */}
            <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #dee2e6' }}>
              <h6 className="text-primary mb-3">Cargar Archivo PDF</h6>
              <Form.Group className="mb-3">
                <Form.Label>Seleccionar archivo PDF</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfChange}
                />
                <Form.Text className="text-muted">
                  Solo se permiten archivos PDF. Tamaño máximo: 10MB
                </Form.Text>
              </Form.Group>

              {archivoPdf && (
                <Alert variant="info" className="mb-0">
                  <strong>Archivo seleccionado:</strong> {archivoPdf.name}
                  <br />
                  <strong>Tamaño:</strong> {(archivoPdf.size / 1024 / 1024).toFixed(2)} MB
                  <br />
                  <small className="text-muted">
                    <strong>Opciones:</strong> Use "Revisar Datos" para ver y editar los productos extraídos antes de crear la orden, 
                    o "Crear Orden Directa" para generar automáticamente la orden con los datos extraídos del PDF.
                  </small>
                </Alert>
              )}
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer className="bg-light border-top">
          <Button variant="secondary" onClick={onHide}>
            Cancelar
          </Button>
          
          {/* Botón para revisar datos extraídos */}
          <Button 
            variant="outline-primary" 
            onClick={procesarOrden}
            disabled={procesando || !archivoPdf || !proveedorSeleccionado || !razonSocialSeleccionada}
          >
            {procesando ? (
              <>
                <i className="fas fa-spinner fa-spin me-2"></i>
                Procesando...
              </>
            ) : (
              <>
                <i className="fas fa-search me-2"></i>
                Revisar Datos
              </>
            )}
          </Button>
          
          {/* Botón para crear orden directamente */}
          <Button 
            variant="success" 
            onClick={crearOrdenDirectamenteDesdePdf}
            disabled={procesando || !archivoPdf || !proveedorSeleccionado || !razonSocialSeleccionada}
          >
            {procesando ? (
              <>
                <i className="fas fa-spinner fa-spin me-2"></i>
                Creando...
              </>
            ) : (
              <>
                <i className="fas fa-plus-circle me-2"></i>
                Crear Orden Directa
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de resultados */}
      <ModalResultados
        show={mostrarModalResultados}
        errorProcesamiento={errorProcesamiento}
        datosOrdenCompletos={datosOrdenCompletos}
        productosEditables={productosEditables}
        totalesCalculados={totalesCalculados}
        onActualizarProducto={actualizarProducto}
        onAgregarProducto={agregarNuevoProducto}
        onVolverAlFormulario={volverAlFormulario}
        onGenerarOrden={generarOrdenCompra}
        editId={editId}
        onCancelar={cancelarProcesamiento}
      />
    </>
  );
};

export default OrdenCompraForm;
