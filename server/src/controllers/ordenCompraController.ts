import { exec, execFile } from 'child_process';
import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import OrdenCompra from '../models/OrdenCompra';
import Proveedor from '../models/Proveedor';
import RazonSocial from '../models/RazonSocial';
import Vendedor from '../models/Vendedor';
import { PdfGeneratorService } from '../services/pdfGenerator';
import { DateUtils } from '../utils/dateUtils';

const execFileAsync = promisify(execFile);
const pdfGenerator = new PdfGeneratorService();

export const getOrdenesCompra = async (req: Request, res: Response) => {
  try {
    const ordenesCompra = await OrdenCompra.find()
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .populate('vendedor', 'nombre correo telefono')
      .sort({ fecha: -1 });

    // Migrar órdenes que no tienen numeroCotizacion pero tienen datosPdf
    const ordenesSinCotizacion = ordenesCompra.filter(orden => 
      !orden.numeroCotizacion && 
      orden.datosOrden?.datosPdf?.datosExtraidos?.folio
    );

    if (ordenesSinCotizacion.length > 0) {
      console.log(`Migrando ${ordenesSinCotizacion.length} órdenes sin número de cotización`);
      for (const orden of ordenesSinCotizacion) {
        const folio = orden.datosOrden.datosPdf.datosExtraidos.folioOriginal || orden.datosOrden.datosPdf.datosExtraidos.folio;
        await OrdenCompra.findByIdAndUpdate(orden._id, { numeroCotizacion: folio });
        orden.numeroCotizacion = folio; // Actualizar en memoria para la respuesta
      }
    }

    res.json(ordenesCompra);
  } catch (err) {
    console.error('Error al obtener órdenes de compra:', err);
    res.status(500).json({ error: 'Error al obtener órdenes de compra' });
  }
};

export const getOrdenCompraById = async (req: Request, res: Response) => {
  try {
    const ordenCompra = await OrdenCompra.findById(req.params.id)
      .populate('proveedor')
      .populate('razonSocial')
      .populate('vendedor');
    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }
    res.json(ordenCompra);
  } catch (err) {
    console.error('Error al obtener orden de compra:', err);
    res.status(500).json({ error: 'Error al obtener orden de compra' });
  }
};

export const createOrdenCompra = async (req: Request, res: Response) => {
  try {
    const { numeroOrden, fecha, proveedor, razonSocial, vendedor, datosOrden } = req.body;
    
    // Validar que el proveedor existe
    const proveedorExists = await Proveedor.findById(proveedor);
    if (!proveedorExists) {
      return res.status(400).json({ error: 'El proveedor especificado no existe' });
    }
    
    // Validar que la razón social existe
    const razonSocialExists = await RazonSocial.findById(razonSocial);
    if (!razonSocialExists) {
      return res.status(400).json({ error: 'La razón social especificada no existe' });
    }

    // Validar vendedor si se proporciona
    if (vendedor) {
      const vendedorExists = await Vendedor.findById(vendedor);
      if (!vendedorExists) {
        return res.status(400).json({ error: 'El vendedor especificado no existe' });
      }
    }
    
    const ordenCompra = new OrdenCompra({
      numeroOrden,
      fecha: fecha ? DateUtils.parseToMexicaliDate(fecha) : DateUtils.getCurrentDateInMexicali(),
      proveedor,
      razonSocial,
      vendedor: vendedor || undefined,
      datosOrden
    });
    
    await ordenCompra.save();
    
    // Devolver la orden con los datos poblados
    const ordenCreada = await OrdenCompra.findById(ordenCompra._id)
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .populate('vendedor', 'nombre correo telefono');
    
    res.status(201).json(ordenCreada);
  } catch (err: any) {
    console.error('Error al crear orden de compra:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'El número de orden ya existe' });
    } else {
      res.status(400).json({ error: 'Error al crear orden de compra' });
    }
  }
};

export const updateOrdenCompra = async (req: Request, res: Response) => {
  try {
    const { numeroOrden, fecha, proveedor, razonSocial, vendedor, datosOrden } = req.body;
    
    // Si se cambia el proveedor, validar que existe
    if (proveedor) {
      const proveedorExists = await Proveedor.findById(proveedor);
      if (!proveedorExists) {
        return res.status(400).json({ error: 'El proveedor especificado no existe' });
      }
    }
    
    // Si se cambia la razón social, validar que existe
    if (razonSocial) {
      const razonSocialExists = await RazonSocial.findById(razonSocial);
      if (!razonSocialExists) {
        return res.status(400).json({ error: 'La razón social especificada no existe' });
      }
    }

    // Si se cambia el vendedor, validar que existe
    if (vendedor) {
      const vendedorExists = await Vendedor.findById(vendedor);
      if (!vendedorExists) {
        return res.status(400).json({ error: 'El vendedor especificado no existe' });
      }
    }
    
    const updateData: any = {};
    if (numeroOrden) updateData.numeroOrden = numeroOrden;
    if (fecha) updateData.fecha = DateUtils.parseToMexicaliDate(fecha);
    if (proveedor) updateData.proveedor = proveedor;
    if (razonSocial) updateData.razonSocial = razonSocial; // Permitir actualización de razón social
    if (vendedor !== undefined) updateData.vendedor = vendedor || null;
    if (datosOrden) updateData.datosOrden = datosOrden;
    
    const ordenCompra = await OrdenCompra.findByIdAndUpdate(req.params.id, updateData, { new: true })
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .populate('vendedor', 'nombre correo telefono');
      
    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }
    res.json(ordenCompra);
  } catch (err: any) {
    console.error('Error al actualizar orden de compra:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'El número de orden ya existe' });
    } else {
      res.status(400).json({ error: 'Error al actualizar orden de compra' });
    }
  }
};

export const deleteOrdenCompra = async (req: Request, res: Response) => {
  try {
    const ordenCompra = await OrdenCompra.findByIdAndDelete(req.params.id);
    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }
    res.json({ message: 'Orden de compra eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar orden de compra:', err);
    res.status(400).json({ error: 'Error al eliminar orden de compra' });
  }
};

// Función adicional para buscar órdenes por proveedor
export const getOrdenesByProveedor = async (req: Request, res: Response) => {
  try {
    const { proveedorId } = req.params;
    const ordenesCompra = await OrdenCompra.find({ proveedor: proveedorId })
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .sort({ fecha: -1 });
    res.json(ordenesCompra);
  } catch (err) {
    console.error('Error al obtener órdenes por proveedor:', err);
    res.status(500).json({ error: 'Error al obtener órdenes por proveedor' });
  }
};

// Función adicional para buscar órdenes por razón social
export const getOrdenesByRazonSocial = async (req: Request, res: Response) => {
  try {
    const { razonSocialId } = req.params;
    const ordenesCompra = await OrdenCompra.find({ razonSocial: razonSocialId })
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .sort({ fecha: -1 });
    res.json(ordenesCompra);
  } catch (err) {
    console.error('Error al obtener órdenes por razón social:', err);
    res.status(500).json({ error: 'Error al obtener órdenes por razón social' });
  }
};

// Función para buscar órdenes por rango de fechas
export const getOrdenesByDateRange = async (req: Request, res: Response) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    const filtro: any = {};
    if (fechaInicio && fechaFin) {
      filtro.fecha = {
        $gte: DateUtils.getStartOfDay(DateUtils.parseToMexicaliDate(fechaInicio as string)),
        $lte: DateUtils.getEndOfDay(DateUtils.parseToMexicaliDate(fechaFin as string))
      };
    }
    
    const ordenesCompra = await OrdenCompra.find(filtro)
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .sort({ fecha: -1 });
    res.json(ordenesCompra);
  } catch (err) {
    console.error('Error al obtener órdenes por rango de fechas:', err);
    res.status(500).json({ error: 'Error al obtener órdenes por rango de fechas' });
  }
};

// Función para ejecutar el script universal de DeepSeek
async function ejecutarScriptUniversal(rutaPDF: string): Promise<any> {
  return new Promise(async (resolve, reject) => {
    try {
      const tiempoInicioScript = Date.now();
      console.log('🚀 [TIMING-BACKEND] Iniciando script universal...');
      
      // Detectar Python - buscar en el entorno virtual primero
      let pythonPath = '';
      const venvPath = path.join(__dirname, '../../../.venv/Scripts/python.exe');
      
      try {
        await ejecutarComando(`"${venvPath}" --version`);
        pythonPath = venvPath;
        console.log('🐍 Python detectado en virtual env:', pythonPath);
      } catch {
        try {
          await ejecutarComando('python --version');
          pythonPath = 'python';
          console.log('🐍 Python detectado en sistema:', pythonPath);
        } catch {
          return reject(new Error('Python no encontrado en el sistema'));
        }
      }

      const scriptPath = path.join(__dirname, '../../scripts/extraer_datos_universal_openia.py');
      const comando = `"${pythonPath}" "${scriptPath}" "${rutaPDF}"`;
      
      console.log('🔧 Ejecutando comando:', comando);
      
      exec(comando, { 
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 180000 // 3 minutos timeout (reducido para mayor velocidad)
      }, (error, stdout, stderr) => {
        if (stderr) {
          console.log('📄 Logs del script:', stderr);
        }
        
        if (error) {
          console.error('❌ Error ejecutando script:', error.message);
          return reject(new Error(`Error al procesar el PDF: ${stderr || error.message}`));
        }

        if (stdout && stdout.trim()) {
          try {
            // Limpiar posibles marcadores de código
            let jsonLimpio = stdout.trim();
            if (jsonLimpio.startsWith('```json')) {
              jsonLimpio = jsonLimpio.replace(/```json\s*/, '').replace(/\s*```$/, '');
            }
            
            const datosExtraidos = JSON.parse(jsonLimpio);
            
            // 🕐 TIEMPO TOTAL DEL SCRIPT
            const tiempoTotalScript = Date.now() - tiempoInicioScript;
            console.log('⏱️ [TIMING-BACKEND] Script completado en:', tiempoTotalScript, 'ms');
            console.log('✅ JSON parseado exitosamente');
            console.log('📋 Folio detectado:', datosExtraidos.folioOriginal);
            console.log('📊 Productos encontrados:', datosExtraidos.productos?.length || 0);
            
            resolve(datosExtraidos);
          } catch (parseError) {
            console.error('❌ Error parseando JSON del script universal:', parseError);
            console.error('📄 Stdout recibido:', stdout);
            reject(parseError);
          }
        } else {
          console.error('❌ Script sin resultado');
          reject(new Error('Script no retornó datos'));
        }
      });
    } catch (error) {
      console.error('❌ Error en ejecutarScriptUniversal:', error);
      reject(error);
    }
  });
}

async function ejecutarComando(comando: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

export const procesarPdf = async (req: Request, res: Response) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo PDF' });
    }

    console.log('📄 Procesando PDF con script universal:', req.file.originalname);
    
    // Usar script universal en lugar de scripts específicos
    const datosExtraidos = await ejecutarScriptUniversal(req.file.path);
    
    // Mapear 'codigo' a 'clave' para compatibilidad con frontend
    if (datosExtraidos.productos && Array.isArray(datosExtraidos.productos)) {
      datosExtraidos.productos = datosExtraidos.productos.map((producto: any) => ({
        ...producto,
        clave: producto.codigo || producto.clave || '', // Mapear codigo → clave
        codigo: producto.codigo || producto.clave || '' // Mantener codigo también
      }));
    }
    
    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);
    
    res.json({
      success: true,
      message: 'PDF procesado exitosamente con OpenAI',
      datosExtraidos: datosExtraidos, // Cambiar de 'datos' a 'datosExtraidos' para compatibilidad con frontend
      proveedor: 'Detectado automáticamente', // El script ya detecta el proveedor
      folio: datosExtraidos.folioOriginal
    });
    
  } catch (error: any) {
    console.error('❌ Error procesando PDF:', error);
    
    // Limpiar archivo si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Error procesando PDF con script universal', 
      details: error.message 
    });
  }
};

export const crearOrdenDesdePdf = async (req: Request, res: Response) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo PDF' });
    }

    const { 
      proveedor: proveedorId, 
      razonSocial: razonSocialId, 
      vendedor: vendedorId,
      direccionEnvio,
      datosAdicionales 
    } = req.body;

    // Validar que se proporcionaron los datos mínimos
    if (!proveedorId || !razonSocialId) {
      return res.status(400).json({ 
        error: 'Se requieren proveedor y razón social para crear la orden' 
      });
    }

    console.log('📄 Creando orden desde PDF:', req.file.originalname);
    
    // Validar que el proveedor existe
    const proveedorData = await Proveedor.findById(proveedorId);
    if (!proveedorData) {
      return res.status(400).json({ error: 'El proveedor especificado no existe' });
    }
    
    // Validar que la razón social existe
    const razonSocialData = await RazonSocial.findById(razonSocialId);
    if (!razonSocialData) {
      return res.status(400).json({ error: 'La razón social especificada no existe' });
    }

    // Validar vendedor si se proporciona
    let vendedorData = null;
    if (vendedorId) {
      vendedorData = await Vendedor.findById(vendedorId);
      if (!vendedorData) {
        return res.status(400).json({ error: 'El vendedor especificado no existe' });
      }
    }

    const rutaArchivo = req.file.path;
    
    try {
      // 1. Procesar con script universal
      const datosExtraidos = await ejecutarScriptUniversal(rutaArchivo);
      
      // Mapear 'codigo' a 'clave' para compatibilidad con frontend
      if (datosExtraidos.productos && Array.isArray(datosExtraidos.productos)) {
        datosExtraidos.productos = datosExtraidos.productos.map((producto: any) => ({
          ...producto,
          clave: producto.codigo || producto.clave || '', // Mapear codigo → clave
          codigo: producto.codigo || producto.clave || '' // Mantener codigo también
        }));
      }
      
      // Generar número de orden único
      const timestamp = DateUtils.formatDateForInput().replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const numeroOrden = `OC-${timestamp}-${random}`;
      
      // 2. Crear orden de compra con los datos extraídos y las relaciones
      const ordenCompra = new OrdenCompra({
        numeroOrden: numeroOrden,
        numeroCotizacion: datosExtraidos.folioOriginal || undefined,
        fecha: datosExtraidos.fecha ? DateUtils.parseToMexicaliDate(datosExtraidos.fecha) : DateUtils.getCurrentDateInMexicali(),
        proveedor: proveedorId,
        razonSocial: razonSocialId,
        vendedor: vendedorId || undefined,
        datosOrden: {
          direccionEnvio: direccionEnvio ? JSON.parse(direccionEnvio) : undefined,
          productos: datosExtraidos.productos || [],
          totalesCalculados: datosExtraidos.totales || {},
          datosPdf: {
            datosExtraidos: datosExtraidos,
            archivoOriginal: req.file.originalname
          },
          moneda: 'MXN',
          porcentajeIvaSimbolico: '16'
        }
      });
      
      await ordenCompra.save();

      // Preparar datos para generar PDF
      const datosParaPdf = {
        numeroOrden: numeroOrden,
        fecha: DateUtils.formatForOrdenCompra(),
        proveedor: proveedorData.toObject(),
        razonSocial: razonSocialData.toObject(),
        vendedor: vendedorData ? vendedorData.toObject() : undefined,
        direccionEnvio: direccionEnvio ? JSON.parse(direccionEnvio) : undefined,
        productos: datosExtraidos.productos || [],
        totalesCalculados: datosExtraidos.totales || {},
        datosPdf: {
          datosExtraidos: datosExtraidos,
          archivoOriginal: req.file.originalname
        },
        moneda: 'MXN',
        porcentajeIvaSimbolico: '16'
      };

      // Generar el PDF de la orden de compra
      const pdfBuffer = await pdfGenerator.generarPdfOrdenCompra(datosParaPdf);
      
      // Crear directorio para PDFs si no existe
      const pdfDir = path.join(__dirname, '..', '..', 'pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      
      // Guardar el PDF en el servidor
      const nombreArchivoPdf = `OrdenCompra-${numeroOrden}-${Date.now()}.pdf`;
      const rutaPdf = path.join(pdfDir, nombreArchivoPdf);
      fs.writeFileSync(rutaPdf, pdfBuffer);
      
      // Actualizar la orden con la ruta del PDF
      ordenCompra.rutaPdf = `pdfs/${nombreArchivoPdf}`;
      await ordenCompra.save();
      
      // Devolver la orden creada con los datos poblados
      const ordenCreada = await OrdenCompra.findById(ordenCompra._id)
        .populate('proveedor', 'empresa')
        .populate('razonSocial', 'nombre rfc')
        .populate('vendedor', 'nombre correo telefono');

      res.status(201).json({
        success: true,
        mensaje: 'Orden de compra creada exitosamente desde PDF',
        orden: ordenCreada,
        datosExtraidos: datosExtraidos,
        archivoOriginal: req.file.originalname,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error al procesar PDF:', error);
      return res.status(500).json({ 
        error: 'Error al procesar el archivo PDF',
        detalles: error instanceof Error ? error.message : 'Error desconocido'
      });
    } finally {
      // Limpiar archivo temporal
      try {
        fs.unlinkSync(rutaArchivo);
        console.log(`Archivo temporal eliminado: ${rutaArchivo}`);
      } catch (unlinkError) {
        console.warn('No se pudo eliminar archivo temporal:', unlinkError);
      }
    }

  } catch (error) {
    console.error('Error general en crearOrdenDesdePdf:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      detalles: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Generar PDF de orden de compra
 */
export const generarPdfOrdenCompra = async (req: Request, res: Response) => {
  try {
    const datosOrden = req.body;
    
    // Validar que se proporcionen los datos mínimos necesarios
    if (!datosOrden || !datosOrden.numeroOrden) {
      return res.status(400).json({ error: 'Faltan datos requeridos para generar la orden de compra' });
    }

    // Generar número de orden si no existe
    if (!datosOrden.numeroOrden) {
      const timestamp = DateUtils.formatDateForInput().replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      datosOrden.numeroOrden = `OC-${timestamp}-${random}`;
    }

    // Asegurar que se incluyan los valores por defecto para moneda y porcentaje de IVA
    datosOrden.moneda = datosOrden.moneda || 'MXN';
    datosOrden.porcentajeIvaSimbolico = datosOrden.porcentajeIvaSimbolico || '16';

    // Generar el PDF
    const pdfBuffer = await pdfGenerator.generarPdfOrdenCompra(datosOrden);
    
    // Configurar headers para la respuesta PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OrdenCompra-${datosOrden.numeroOrden}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el PDF
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('Error al generar PDF de orden de compra:', error);
    res.status(500).json({ 
      error: 'Error al generar PDF de orden de compra',
      detalles: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Crear orden de compra y generar PDF
 */
export const crearOrdenCompraConPdf = async (req: Request, res: Response) => {
  try {
    const { 
      numeroOrden, 
      fecha, 
      proveedor, 
      razonSocial, 
      vendedor, 
      direccionEnvio,
      productos,
      totalesCalculados,
      datosPdf,
      moneda,
      porcentajeIvaSimbolico
    } = req.body;
    
    // Validar que el proveedor existe
    const proveedorData = await Proveedor.findById(proveedor);
    if (!proveedorData) {
      return res.status(400).json({ error: 'El proveedor especificado no existe' });
    }
    
    // Validar que la razón social existe
    const razonSocialData = await RazonSocial.findById(razonSocial);
    if (!razonSocialData) {
      return res.status(400).json({ error: 'La razón social especificada no existe' });
    }

    // Validar vendedor si se proporciona
    let vendedorData = null;
    if (vendedor) {
      vendedorData = await Vendedor.findById(vendedor);
      if (!vendedorData) {
        return res.status(400).json({ error: 'El vendedor especificado no existe' });
      }
    }

    // Generar número de orden si no se proporciona
    let numeroOrdenFinal = numeroOrden;
    if (!numeroOrdenFinal) {
      const timestamp = DateUtils.formatDateForInput().replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      numeroOrdenFinal = `OC-${timestamp}-${random}`;
    }
    
    // Crear la orden de compra en la base de datos
    const ordenCompra = new OrdenCompra({
      numeroOrden: numeroOrdenFinal,
      numeroCotizacion: datosPdf?.datosExtraidos?.folioOriginal || datosPdf?.datosExtraidos?.folio || undefined, // Usar folioOriginal primero
      fecha: fecha ? DateUtils.parseToMexicaliDate(fecha) : DateUtils.getCurrentDateInMexicali(),
      proveedor,
      razonSocial,
      vendedor: vendedor || undefined,
      datosOrden: {
        direccionEnvio,
        productos,
        totalesCalculados,
        datosPdf,
        moneda: moneda || 'MXN',
        porcentajeIvaSimbolico: porcentajeIvaSimbolico || '16'
      }
    });
    
    await ordenCompra.save();
    
    // Preparar datos para generar PDF
    const datosParaPdf = {
      numeroOrden: numeroOrdenFinal,
      fecha: fecha ? DateUtils.formatForOrdenCompra(fecha) : DateUtils.formatForOrdenCompra(),
      proveedor: proveedorData.toObject(),
      razonSocial: razonSocialData.toObject(),
      vendedor: vendedorData ? vendedorData.toObject() : undefined,
      direccionEnvio,
      productos,
      totalesCalculados,
      datosPdf,
      moneda: moneda || 'MXN',
      porcentajeIvaSimbolico: porcentajeIvaSimbolico || '16'
    };
    
    // Generar el PDF
    const pdfBuffer = await pdfGenerator.generarPdfOrdenCompra(datosParaPdf);
    
    // Crear directorio para PDFs si no existe
    const pdfDir = path.join(__dirname, '..', '..', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    // Guardar el PDF en el servidor
    const nombreArchivoPdf = `OrdenCompra-${numeroOrdenFinal}-${Date.now()}.pdf`;
    const rutaPdf = path.join(pdfDir, nombreArchivoPdf);
    fs.writeFileSync(rutaPdf, pdfBuffer);
    
    // Actualizar la orden con la ruta del PDF
    ordenCompra.rutaPdf = `pdfs/${nombreArchivoPdf}`;
    await ordenCompra.save();
    
    // Devolver la orden creada y el PDF
    const ordenCreada = await OrdenCompra.findById(ordenCompra._id)
      .populate('proveedor', 'empresa')
      .populate('razonSocial', 'nombre rfc')
      .populate('vendedor', 'nombre correo telefono');
    
    // Configurar headers para la respuesta PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OrdenCompra-${numeroOrdenFinal}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-Orden-Id', ordenCreada?._id?.toString() || '');
    
    // Enviar el PDF
    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al crear orden de compra con PDF:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'El número de orden ya existe' });
    } else {
      res.status(400).json({ 
        error: 'Error al crear orden de compra con PDF',
        detalles: err.message
      });
    }
  }
};

/**
 * Actualizar orden de compra y regenerar PDF
 */
export const updateOrdenCompraConPdf = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      numeroOrden, 
      fecha, 
      proveedor, 
      razonSocial, 
      vendedor, 
      direccionEnvio,
      productos,
      totalesCalculados,
      datosPdf,
      moneda,
      porcentajeIvaSimbolico
    } = req.body;
    
    // Buscar la orden existente
    const ordenExistente = await OrdenCompra.findById(id);
    if (!ordenExistente) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }
    
    // Validar que el proveedor existe
    const proveedorData = await Proveedor.findById(proveedor);
    if (!proveedorData) {
      return res.status(400).json({ error: 'El proveedor especificado no existe' });
    }
    
    // Validar que la razón social existe
    const razonSocialData = await RazonSocial.findById(razonSocial);
    if (!razonSocialData) {
      return res.status(400).json({ error: 'La razón social especificada no existe' });
    }

    // Validar vendedor si se proporciona
    let vendedorData = null;
    if (vendedor) {
      vendedorData = await Vendedor.findById(vendedor);
      if (!vendedorData) {
        return res.status(400).json({ error: 'El vendedor especificado no existe' });
      }
    }
    
    // Actualizar la orden de compra en la base de datos
    const updateData = {
      numeroOrden: numeroOrden || ordenExistente.numeroOrden,
      numeroCotizacion: datosPdf?.datosExtraidos?.folio || ordenExistente.numeroCotizacion,
      fecha: fecha ? DateUtils.parseToMexicaliDate(fecha) : ordenExistente.fecha,
      proveedor,
      razonSocial,
      vendedor: vendedor || undefined,
      datosOrden: {
        direccionEnvio,
        productos,
        totalesCalculados,
        datosPdf,
        moneda: moneda || 'MXN',
        porcentajeIvaSimbolico: porcentajeIvaSimbolico || '16'
      }
    };
    
    const ordenActualizada = await OrdenCompra.findByIdAndUpdate(id, updateData, { new: true })
      .populate('proveedor')
      .populate('razonSocial')
      .populate('vendedor');
    
    if (!ordenActualizada) {
      return res.status(500).json({ error: 'Error al actualizar la orden de compra' });
    }
    
    // Preparar datos para generar PDF
    const datosParaPdf = {
      numeroOrden: ordenActualizada.numeroOrden,
      fecha: DateUtils.formatForOrdenCompra(ordenActualizada.fecha),
      proveedor: proveedorData.toObject(),
      razonSocial: razonSocialData.toObject(),
      vendedor: vendedorData ? vendedorData.toObject() : undefined,
      direccionEnvio,
      productos,
      totalesCalculados,
      datosPdf,
      moneda: moneda || 'MXN',
      porcentajeIvaSimbolico: porcentajeIvaSimbolico || '16'
    };
    
    // Generar el PDF actualizado
    const pdfBuffer = await pdfGenerator.generarPdfOrdenCompra(datosParaPdf);
    
    // Crear directorio para PDFs si no existe
    const pdfDir = path.join(__dirname, '..', '..', 'pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    // Eliminar PDF anterior si existe
    if (ordenExistente.rutaPdf) {
      const rutaPdfAnterior = path.join(__dirname, '..', '..', ordenExistente.rutaPdf);
      try {
        if (fs.existsSync(rutaPdfAnterior)) {
          fs.unlinkSync(rutaPdfAnterior);
        }
      } catch (error) {
        console.warn('No se pudo eliminar PDF anterior:', error);
      }
    }
    
    // Guardar el nuevo PDF en el servidor
    const nombreArchivoPdf = `OrdenCompra-${ordenActualizada.numeroOrden}-${Date.now()}.pdf`;
    const rutaPdf = path.join(pdfDir, nombreArchivoPdf);
    fs.writeFileSync(rutaPdf, pdfBuffer);
    
    // Actualizar la ruta del PDF en la orden
    ordenActualizada.rutaPdf = `pdfs/${nombreArchivoPdf}`;
    await ordenActualizada.save();
    
    // Configurar headers para la respuesta PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OrdenCompra-${ordenActualizada.numeroOrden}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-Orden-Id', String(ordenActualizada._id));
    
    // Enviar el PDF
    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al actualizar orden de compra con PDF:', err);
    if (err.code === 11000) {
      res.status(400).json({ error: 'El número de orden ya existe' });
    } else {
      res.status(400).json({ 
        error: 'Error al actualizar orden de compra con PDF',
        detalles: err.message
      });
    }
  }
};

/**
 * Obtener PDF de una orden de compra específica
 */
export const getPdfOrdenCompra = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Buscar la orden de compra
    const ordenCompra = await OrdenCompra.findById(id);
    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }
    
    // Verificar si tiene PDF asociado
    if (!ordenCompra.rutaPdf) {
      return res.status(404).json({ error: 'No se ha generado PDF para esta orden' });
    }
    
    // Construir la ruta completa del archivo
    const rutaCompleta = path.join(__dirname, '..', '..', ordenCompra.rutaPdf);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({ error: 'Archivo PDF no encontrado en el servidor' });
    }
    
    // Leer el archivo PDF
    const pdfBuffer = fs.readFileSync(rutaCompleta);
    
    // Configurar headers para mostrar el PDF en el navegador
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="OrdenCompra-${ordenCompra.numeroOrden}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el PDF
    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al obtener PDF de orden de compra:', err);
    res.status(500).json({ 
      error: 'Error al obtener PDF de orden de compra',
      detalles: err.message
    });
  }
};

/**
 * Descargar PDF de una orden de compra específica
 */
export const descargarPdfOrdenCompra = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Buscar la orden de compra
    const ordenCompra = await OrdenCompra.findById(id);
    if (!ordenCompra) {
      return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }
    
    // Verificar si tiene PDF asociado
    if (!ordenCompra.rutaPdf) {
      return res.status(404).json({ error: 'No se ha generado PDF para esta orden' });
    }
    
    // Construir la ruta completa del archivo
    const rutaCompleta = path.join(__dirname, '..', '..', ordenCompra.rutaPdf);
    
    // Verificar que el archivo existe
    if (!fs.existsSync(rutaCompleta)) {
      return res.status(404).json({ error: 'Archivo PDF no encontrado en el servidor' });
    }
    
    // Leer el archivo PDF
    const pdfBuffer = fs.readFileSync(rutaCompleta);
    
    // Configurar headers para forzar descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="OrdenCompra-${ordenCompra.numeroOrden}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Enviar el PDF
    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al descargar PDF de orden de compra:', err);
    res.status(500).json({ 
      error: 'Error al descargar PDF de orden de compra',
      detalles: err.message
    });
  }
};
