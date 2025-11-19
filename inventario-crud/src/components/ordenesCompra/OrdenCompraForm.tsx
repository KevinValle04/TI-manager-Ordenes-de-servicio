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
    Row,
    Toast,
    ToastContainer
} from "react-bootstrap";
import { Proveedor, RazonSocial } from "../../types";
import ModalResultados from "./ModalResultados";

interface OrdenCompraFormProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: any) => void;
  editId?: string | null;
  onOrdenCreada?: () => void; // Nueva prop para notificar cuando se crea una orden
  proyectos: any[]; // Array de proyectos disponibles
}

const OrdenCompraForm: React.FC<OrdenCompraFormProps> = ({ show, onHide, editId, onOrdenCreada, proyectos }) => {
  // Estados para notificaciones
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState<'success' | 'danger' | 'warning'>('warning');

  // Estados del formulario
  const [numeroOrden, setNumeroOrden] = useState("");
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<string>("");
  
  // Estado para modal de error de OpenAI
  const [showOpenAIErrorModal, setShowOpenAIErrorModal] = useState(false);
  const [openAIErrorDetails, setOpenAIErrorDetails] = useState<{
    type: string;
    title: string;
    message: string;
    details?: string;
  }>({ type: '', title: '', message: '' });
  
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
  
  // useEffect para monitorear cambios en totalesCalculados
  useEffect(() => {
    console.log('📊 totalesCalculados actualizado:', totalesCalculados);
  }, [totalesCalculados]);
  
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
          
          // Cargar proyecto si existe
          if (orden.proyecto) {
            const proyectoId = typeof orden.proyecto === 'object' ? orden.proyecto._id : orden.proyecto;
            setProyectoSeleccionado(proyectoId || '');
          }
          
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
    setProyectoSeleccionado('');
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
      
      // Inicializar productos editables y obtener totales calculados
      const totales = inicializarProductosEditables(datosPdf);
      
      // Log de depuración antes de mostrar el modal
      console.log('🚀 Abriendo modal de resultados con totales:', totales);
      console.log('🚀 Datos PDF extraídos:', datosPdf.datosExtraidos?.totales);
      
      setMostrarModalResultados(true);

    } catch (error: any) {
      console.error('Error al procesar orden:', error);
      
      // Manejo específico de errores de OpenAI - QUOTA EXCEEDED
      if (error.response?.data?.type === 'OPENAI_QUOTA_EXCEEDED' || 
          (error.message && error.message.includes('OPENAI_QUOTA_EXCEEDED'))) {
        console.log('Detectado error de OpenAI quota, mostrando modal');
        setOpenAIErrorDetails({
          type: 'OPENAI_QUOTA_EXCEEDED',
          title: '🚫 Tokens de OpenAI Agotados',
          message: error.response?.data?.message || 'Se han agotado los tokens de OpenAI disponibles.',
          details: 'Para continuar procesando documentos, es necesario contactar al administrador del sistema para recargar la cuenta. Los tokens se renovarán automáticamente en el próximo ciclo de facturación.'
        });
        setShowOpenAIErrorModal(true);
        // Limpiar el campo de archivo
        if (document.querySelector('input[type="file"]')) {
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        }
        setArchivoPdf(null);
        return; // Salir para evitar el setErrorProcesamiento duplicado
      }
      
      // Manejo específico de errores de OpenAI - PROCESSING FAILED
      if (error.response?.data?.type === 'OPENAI_PROCESSING_FAILED' || 
          (error.message && error.message.includes('OPENAI_PROCESSING_FAILED'))) {
        console.log('Detectado error de OpenAI processing, mostrando modal');
        setOpenAIErrorDetails({
          type: 'OPENAI_PROCESSING_FAILED',
          title: '⚠️ Error de Procesamiento OpenAI',
          message: error.response?.data?.message || 'El servicio de OpenAI no pudo procesar el documento.',
          details: 'Esto puede deberse a que el PDF no contiene texto legible o el formato no es compatible. Verifica que el documento no sea una imagen escaneada e intenta nuevamente.'
        });
        setShowOpenAIErrorModal(true);
        // Limpiar el campo de archivo
        if (document.querySelector('input[type="file"]')) {
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        }
        setArchivoPdf(null);
        return; // Salir para evitar el setErrorProcesamiento duplicado
      }
      
      // Mejorado el manejo de errores para PDF escaneado
      if (error.response?.data?.type === 'PDF_ESCANEADO' || (error.message && error.message.includes('PDF escaneado'))) {
        const mensaje = error.response?.data?.message || 
                       'El archivo parece ser un PDF escaneado. Por favor, sube un PDF que contenga texto digital.';
        console.log('Detectado PDF escaneado, mostrando mensaje:', mensaje);
        setErrorProcesamiento(mensaje);
        // Limpiar el campo de archivo
        if (document.querySelector('input[type="file"]')) {
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        }
        setArchivoPdf(null);
        return; // Salir para evitar el setErrorProcesamiento duplicado
      }
      
      setErrorProcesamiento(
        error.response?.data?.message || 
        (error.message || 'Error desconocido al procesar la orden')
      );
    } finally {
      setProcesando(false);
    }
  };

  // Procesar PDF con detección automática del proveedor
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
    if (proyectoSeleccionado) {
      formData.append('proyecto', proyectoSeleccionado);
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
      
      // Verificar si es un error de OpenAI quota exceeded
      if ((error as any).response?.data?.type === 'OPENAI_QUOTA_EXCEEDED') {
        throw new Error('OPENAI_QUOTA_EXCEEDED');
      }
      
      // Verificar si es un error de OpenAI processing failed
      if ((error as any).response?.data?.type === 'OPENAI_PROCESSING_FAILED') {
        throw new Error('OPENAI_PROCESSING_FAILED');
      }
      
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
    } catch (error: any) {
      console.error('Error al procesar PDF:', error);
      
      // Verificar si es un error de OpenAI quota exceeded
      if (error.response?.data?.type === 'OPENAI_QUOTA_EXCEEDED') {
        const errorData = {
          response: {
            data: {
              type: 'OPENAI_QUOTA_EXCEEDED',
              message: error.response.data.message || 'Se han agotado los tokens de OpenAI disponibles. Por favor, contacta al administrador para recargar la cuenta o intenta más tarde.'
            }
          }
        };
        throw errorData;
      }
      
      // Verificar si es un error de OpenAI processing failed
      if (error.response?.data?.type === 'OPENAI_PROCESSING_FAILED') {
        const errorData = {
          response: {
            data: {
              type: 'OPENAI_PROCESSING_FAILED',
              message: error.response.data.message || 'El servicio de OpenAI no pudo procesar el documento. Verifica que el PDF contenga texto legible e intenta nuevamente.'
            }
          }
        };
        throw errorData;
      }
      
      // Verificar si el error viene directamente del backend - PDF escaneado
      if (error.response?.data?.type === 'PDF_ESCANEADO') {
        const errorData = {
          response: {
            data: {
              type: 'PDF_ESCANEADO',
              message: error.response.data.message || 'El archivo parece ser un PDF escaneado. Por favor, sube un PDF que contenga texto digital.'
            }
          }
        };
        throw errorData;
      }
      // Verificar si el mensaje de error contiene la palabra clave
      if (error.message && error.message.includes('PDF escaneado')) {
        const errorData = {
          response: {
            data: {
              type: 'PDF_ESCANEADO',
              message: 'El archivo parece ser un PDF escaneado. Por favor, sube un PDF que contenga texto digital.'
            }
          }
        };
        throw errorData;
      }
      throw new Error(error.response?.data?.message || 'Error al procesar el archivo PDF. Verifique que el archivo sea válido.');
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
  const inicializarProductosEditables = (datosPdf: any): { subTotal: number; iva: number; total: number } => {
    // Los productos están en datosPdf.datosExtraidos.productos
    if (datosPdf.datosExtraidos && datosPdf.datosExtraidos.productos) {
      const productos = datosPdf.datosExtraidos.productos.map((producto: any, index: number) => {
        const cantidad = parseNumericValue(producto.cantidad);
        
        // 🔧 MAPEO INTELIGENTE DE PRECIOS POR PROVEEDOR:
        // 1. PRIORIDAD: precioUnitario directo (SYSCOM, PRECIO DE DISTRIBUIDOR, etc.)
        // 2. EXCEPCIÓN PORTENTUM: para Portentum usar precioLista como precioUnitario
        // 3. FALLBACK: precioListaUnitario (GRUPO DICE)
        
        // Detectar si es Portentum/Aruba (múltiples variantes del nombre)
        const esPortentum = proveedorSeleccionado?.empresa?.toLowerCase().includes('portentum') ||
                            proveedorSeleccionado?.empresa?.toLowerCase().includes('portenntu') ||
                            proveedorSeleccionado?.empresa?.toLowerCase().includes('aruba') ||
                            JSON.stringify(producto).toLowerCase().includes('portentum') ||
                            JSON.stringify(producto).toLowerCase().includes('portenntu') ||
                            JSON.stringify(producto).toLowerCase().includes('aruba') ||
                            (datosPdf.nombreArchivo && (
                              datosPdf.nombreArchivo.toLowerCase().includes('portentum') ||
                              datosPdf.nombreArchivo.toLowerCase().includes('portenntu') ||
                              datosPdf.nombreArchivo.toLowerCase().includes('aruba')
                            )) ||
                            JSON.stringify(datosPdf).toLowerCase().includes('portentum') ||
                            JSON.stringify(datosPdf).toLowerCase().includes('portenntu') ||
                            JSON.stringify(datosPdf).toLowerCase().includes('aruba');
        
        // 🔍 DEBUG: Log para entender qué está pasando con Portentum/Aruba
        if (index < 3) {
          console.log(`🔍 DEBUG Producto ${index + 1}:`, {
            proveedorSeleccionado: proveedorSeleccionado?.empresa,
            esPortentum: esPortentum,
            nombreArchivo: datosPdf.nombreArchivo,
            productoCompleto: producto,
            precioLista: producto.precioLista,
            precioUnitario: producto.precioUnitario,
            precioListaUnitario: producto.precioListaUnitario
          });
        }
        
        let precioUnitario = 0;
        if (esPortentum) {
          // Para Portentum: usar PRECIO COSTO como precio unitario (ya extraído correctamente del JSON)
          precioUnitario = parseNumericValue(producto.precioUnitario) ||           // PORTENTUM: precio costo
                          parseNumericValue(producto.precio) ||                   // Fallback genérico
                          0;
        } else {
          precioUnitario = parseNumericValue(producto.precioUnitario) ||           // SYSCOM/PRECIO DISTRIBUIDOR: precio directo
                          parseNumericValue(producto.precioListaUnitario) ||      // GRUPO DICE: precio de lista
                          parseNumericValue(producto.precioLista) ||              // Otros: precio lista
                          parseNumericValue(producto.precio) ||                   // Genérico: precio
                          parseNumericValue(producto.precioNeto) ||               // Alternativo: precio neto
                          0;
        }
        
        // 🔧 DESCUENTOS: Solo para proveedores que los manejen explícitamente
        // NOTA: Si se usa PRECIO DE DISTRIBUIDOR (TVC), el descuento será 0 (ya aplicado)
        // SYSCOM no usa descuentos, GRUPO DICE sí, TVC usa precio distribuidor sin descuentos adicionales
        
        // Detectar si es TVC basado en el proveedor seleccionado o campos del PDF
        const esTVC = proveedorSeleccionado?.empresa?.toLowerCase().includes('tvc') || 
                      JSON.stringify(producto).toLowerCase().includes('precio distribuidor') ||
                      JSON.stringify(producto).toLowerCase().includes('precio distribu');
        
        const tieneDescuentoExplicito = producto.descuentoPorcentaje !== undefined || 
                                       producto.descuento !== undefined;
        
        // Para TVC, Portentum y Aruba: siempre descuento = 0, para otros: usar descuento explícito si existe
        let descuentoPorcentaje = 0;
        if (!esTVC && !esPortentum && tieneDescuentoExplicito) {
          descuentoPorcentaje = parseNumericValue(producto.descuentoPorcentaje) || 
                               parseNumericValue(producto.descuento) || 0;
        }
        
        const importeOriginal = parseNumericValue(producto.importe) || 
                               parseNumericValue(producto.total) ||
                               parseNumericValue(producto.subtotal) ||
                               (cantidad * precioUnitario);
        
        // Calcular el importe final
        const importe = importeOriginal > 0 ? importeOriginal : (cantidad * precioUnitario);
        
        const productoMapeado = {
          cantidad: cantidad,
          unidad: producto.unidad || 'PIEZA',
          codigo: producto.codigo || producto.clave || '',
          clave: producto.codigo || producto.clave || '', // Agregar mapeo explícito para el modal
          descripcion: producto.descripcion || producto.concepto || '',
          precioUnitario: precioUnitario, // ✅ PRIORIZA precioUnitario directo
          descuento: descuentoPorcentaje, // ✅ TVC, Portentum y Aruba = 0, otros = valor explícito
          importe: importe // El importe final
        };
        
        // Log para TVC, Portentum y Aruba cuando se detecta y se aplica descuento cero
        if ((esTVC || esPortentum) && index < 3) {
          console.log(`🔵 ${esTVC ? 'TVC' : 'Portentum/Aruba'} detectado - Producto ${index + 1}:`, {
            esDetectadoComoTVC: esTVC,
            esDetectadoComoPortentum: esPortentum,
            descuentoOriginal: producto.descuentoPorcentaje || producto.descuento,
            descuentoFinal: descuentoPorcentaje,
            precioUnitario: precioUnitario
          });
        }
        
        // Log solo productos con problemas de precio
        if (precioUnitario === 0 && index < 5) {
          console.log(`⚠️ Producto ${index + 1} sin precio unitario:`, {
            original: producto,
            mapeado: productoMapeado
          });
        }
        
        return productoMapeado;
      });
      
      setProductosEditables(productos);
      
      // Calcular totales y retornarlos para que el componente padre pueda usarlos inmediatamente
      let totalesCalculados = { subTotal: 0, iva: 0, total: 0 };
      
      // Usar totales del PDF si están disponibles, sino calcular automáticamente
      if (datosPdf.datosExtraidos.totales) {
        const totalesPdf = datosPdf.datosExtraidos.totales;
        
        // Buscar subtotal con diferentes nombres posibles
        const subtotal = parseNumericValue(
          totalesPdf.subTotal || 
          totalesPdf['SUB-TOTAL'] || 
          totalesPdf.Subtotal || 
          totalesPdf.subtotal || 
          0
        );
        
        // Buscar IVA con diferentes nombres posibles
        const iva = parseNumericValue(
          totalesPdf.iva || 
          totalesPdf.IVA || 
          totalesPdf['8% I.V.A.'] || 
          totalesPdf['16% IVA'] || 
          totalesPdf['IVA (16%)'] || 
          0
        );
        
        // Buscar total con diferentes nombres posibles
        const total = parseNumericValue(
          totalesPdf.total || 
          totalesPdf.Total || 
          totalesPdf.TOTAL || 
          0
        );
        
        console.log('📊 Totales extraídos del PDF:', {
          original: totalesPdf,
          procesado: { subtotal, iva, total }
        });
        
        totalesCalculados = {
          subTotal: subtotal,
          iva: iva,
          total: total
        };
        
        console.log('✅ Actualizando totales calculados:', totalesCalculados);
        setTotalesCalculados(totalesCalculados);
      } else {
        // ✅ NO calcular totales automáticamente - dejar que el modal lo haga
        // Solo inicializar totales vacíos 
        totalesCalculados = {
          subTotal: 0,
          iva: 0,
          total: 0
        };
        
        console.log('✅ Productos preparados, totales se calcularán en el modal');
        setTotalesCalculados(totalesCalculados);
      }
      
      return totalesCalculados; // Retornar los totales para uso inmediato
    } else {
      // Si no hay productos, inicializar arrays vacíos
      setProductosEditables([]);
      const totalesVacios = { subTotal: 0, iva: 0, total: 0 };
      setTotalesCalculados(totalesVacios);
      return totalesVacios;
    }
  };  const calcularTotales = useCallback((productos: any[]) => {
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
    console.log('🔧 actualizarProducto llamado:', { index, campo, valor });
    
    setProductosEditables(prev => {
      const nuevosProductos = [...prev];
      
      console.log('📋 Estado anterior:', prev[index]);
      
      // Manejar eliminación de producto
      if (campo === 'eliminar') {
        nuevosProductos.splice(index, 1);
        console.log(`🗑️ Producto ${index} eliminado`);
      } else {
        const productoActualizado = {
          ...nuevosProductos[index],
          [campo]: valor
        };
        
        // Sincronizar codigo y clave cuando se actualiza cualquiera de los dos
        if (campo === 'codigo') {
          productoActualizado.clave = valor;
        } else if (campo === 'clave') {
          productoActualizado.codigo = valor;
        }
        
        nuevosProductos[index] = productoActualizado;
        console.log('📋 Estado nuevo:', productoActualizado);
      }
      
      console.log('🔄 Producto actualizado:', { 
        index, 
        campo, 
        valor, 
        totalProductos: nuevosProductos.length,
        estadoCompleto: nuevosProductos
      });
      
      return nuevosProductos;
    });
  }, []); // Sin dependencias porque ya no usa calcularTotales

  // Función para agregar producto optimizada
  const agregarNuevoProducto = useCallback(() => {
    const nuevoProducto = {
      clave: '',
      codigo: '', // Agregar codigo también
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

            {/* Selección de Proyecto (Opcional) */}
            <Row className="mb-3">
              <Col md={12}>
                <Form.Group>
                  <Form.Label>
                    Proyecto (Opcional)
                    <small className="text-muted ms-2">
                      Seleccione un proyecto para asociar esta orden de compra
                    </small>
                  </Form.Label>
                  <Form.Select
                    value={proyectoSeleccionado}
                    onChange={(e) => setProyectoSeleccionado(e.target.value)}
                  >
                    <option value="">Sin proyecto asignado</option>
                    {proyectos && proyectos.map((proyecto) => (
                      <option key={proyecto._id} value={proyecto._id}>
                        {proyecto.nombre} - {proyecto.estado}
                      </option>
                    ))}
                  </Form.Select>
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
                {errorProcesamiento && errorProcesamiento.includes('PDF escaneado') && (
                  <div className="text-danger mt-2">
                    <i className="fas fa-exclamation-circle me-1"></i>
                    El archivo parece ser un PDF escaneado. Por favor, sube un PDF que contenga texto digital.
                  </div>
                )}
              </Form.Group>

              {archivoPdf && (
                <Alert variant="info" className="mb-0">
                  <strong>Archivo seleccionado:</strong> {archivoPdf.name}
                  <br />
                  <strong>Tamaño:</strong> {(archivoPdf.size / 1024 / 1024).toFixed(2)} MB
                  <br />
                  <small className="text-muted">
                    <strong>Opciones:</strong> Use "Procesar Orden" para extraer y editar los productos antes de crear la orden.
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
          
          {/* Botón para procesar orden */}
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
                <i className="fas fa-cogs me-2"></i>
                Procesar Orden
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
        proyectoId={proyectoSeleccionado || undefined}
        proyectos={proyectos}
        onActualizarTotales={(totales) => setTotalesCalculados(totales)}
      />

      {/* Toast de notificaciones */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999, position: 'fixed', top: 20, right: 20 }}>
        <Toast 
          show={showToast} 
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header closeButton={false}>
            <strong className="me-auto">
              {toastVariant === 'warning' && <i className="fas fa-exclamation-triangle me-2"></i>}
              Aviso
            </strong>
          </Toast.Header>
          <Toast.Body className={toastVariant === 'warning' ? 'text-dark' : 'text-white'}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Modal de Error OpenAI */}
      <Modal 
        show={showOpenAIErrorModal} 
        onHide={() => setShowOpenAIErrorModal(false)} 
        size="lg" 
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="fas fa-robot me-2"></i>
            {openAIErrorDetails.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <div className="mb-3">
              {openAIErrorDetails.type === 'OPENAI_QUOTA_EXCEEDED' ? (
                <div style={{ fontSize: '4rem' }}>🚫</div>
              ) : (
                <div style={{ fontSize: '4rem' }}>⚠️</div>
              )}
            </div>
            
            <h5 className="fw-bold mb-3">{openAIErrorDetails.message}</h5>
            
            {openAIErrorDetails.details && (
              <Alert variant={openAIErrorDetails.type === 'OPENAI_QUOTA_EXCEEDED' ? 'warning' : 'info'} className="text-start">
                <div className="small">
                  <strong>Detalles:</strong><br />
                  {openAIErrorDetails.details}
                </div>
              </Alert>
            )}
            
            {openAIErrorDetails.type === 'OPENAI_QUOTA_EXCEEDED' && (
              <Alert variant="primary" className="text-start">
                <div className="small">
                  <strong>¿Qué puedes hacer?</strong><br />
                  • Contactar al administrador del sistema<br />
                  • Esperar a que se renueven los tokens automáticamente<br />
                  • Intentar más tarde cuando el límite se haya reiniciado
                </div>
              </Alert>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="primary" 
            onClick={() => setShowOpenAIErrorModal(false)}
            className="px-4"
          >
            <i className="fas fa-check me-2"></i>
            Entendido
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default OrdenCompraForm;
