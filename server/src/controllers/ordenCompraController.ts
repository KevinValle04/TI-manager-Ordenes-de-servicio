import { execFile } from 'child_process';
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
        const folio = orden.datosOrden.datosPdf.datosExtraidos.folio;
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

export const procesarPdf = async (req: Request, res: Response) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo PDF' });
    }

    // Obtener el proveedor desde el body
    const { proveedor } = req.body;
    if (!proveedor) {
      return res.status(400).json({ error: 'Debe especificar el proveedor' });
    }

    const rutaArchivo = req.file.path;
    
    try {
      // Determinar qué script usar según el proveedor
      const scriptPath = await getScriptPath(proveedor);
      
      if (!scriptPath) {
        return res.status(400).json({ 
          error: `No hay script de procesamiento disponible para el proveedor: ${proveedor}` 
        });
      }

      // Ejecutar el script Python
      console.log(`Ejecutando script: ${scriptPath} con archivo: ${rutaArchivo}`);

      const { stdout, stderr } = await execFileAsync('python', [scriptPath, rutaArchivo], {
        timeout: 30000 // 30 segundos de timeout
      });

      if (stderr) {
        console.warn('Warning del script Python:', stderr);
      }

      // Parsear el resultado JSON
      let datosExtraidos;
      try {
        datosExtraidos = JSON.parse(stdout);
      } catch (parseError) {
        console.error('Error al parsear JSON del script:', parseError);
        console.error('Salida del script:', stdout);
        return res.status(500).json({ 
          error: 'Error al procesar la respuesta del script de extracción' 
        });
      }

      // Retornar los datos extraídos
      res.json({
        success: true,
        proveedor: proveedor,
        archivo: req.file.originalname,
        datosExtraidos: datosExtraidos,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error al ejecutar script:', error);
      res.status(500).json({ 
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
    console.error('Error general en procesarPdf:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      detalles: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

/**
 * Determina qué script usar según el proveedor
 * Acepta tanto el nombre de la empresa como un ID de proveedor
 */
async function getScriptPath(proveedorInfo: string): Promise<string | null> {
  const scriptsDir = path.join(__dirname, '..', '..', 'scripts');
  
  let nombreProveedor = proveedorInfo;
  
  // Si el parámetro parece ser un ID de MongoDB, buscar el proveedor en la BD
  if (proveedorInfo.match(/^[0-9a-fA-F]{24}$/)) {
    try {
      const proveedor = await Proveedor.findById(proveedorInfo);
      if (proveedor) {
        nombreProveedor = proveedor.empresa;
      }
    } catch (error) {
      console.warn('Error al buscar proveedor por ID:', error);
    }
  }
  
  // Normalizar nombre del proveedor para comparación
  const proveedorNormalizado = nombreProveedor.toLowerCase().trim();
  
  // Mapeo de proveedores a scripts (incluyendo variaciones del nombre)
  const scriptMap: { [key: string]: string } = {
    'syscom': 'extraer_datos_syscom.py',
    'portenntum': 'script_auto_portenntum.py',
    'tvc': 'extraer_datos_tvc.py',
    'grupo dice': 'extraer_datos_grupo_dice.py',
  };

  // Buscar coincidencia exacta primero
  if (scriptMap[proveedorNormalizado]) {
    const scriptPath = path.join(scriptsDir, scriptMap[proveedorNormalizado]);
    if (fs.existsSync(scriptPath)) {
      return scriptPath;
    }
  }

  // Buscar coincidencia parcial (el nombre del proveedor contiene alguna clave)
  for (const [key, scriptName] of Object.entries(scriptMap)) {
    if (proveedorNormalizado.includes(key) || key.includes(proveedorNormalizado)) {
      const scriptPath = path.join(scriptsDir, scriptName);
      if (fs.existsSync(scriptPath)) {
        return scriptPath;
      }
    }
  }

  console.warn(`No se encontró script para el proveedor: ${nombreProveedor} (original: ${proveedorInfo})`);
  return null;
}

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
      numeroCotizacion: datosPdf?.datosExtraidos?.folio || undefined, // Extraer número de cotización del PDF
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

/**
 * Crear orden de compra desde PDF con detección automática del proveedor
 */
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
        error: 'Debe especificar el proveedor y la razón social' 
      });
    }

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
      // Determinar qué script usar según el proveedor
      const scriptPath = await getScriptPath(proveedorData.empresa);
      
      if (!scriptPath) {
        return res.status(400).json({ 
          error: `No hay script de procesamiento disponible para el proveedor: ${proveedorData.empresa}` 
        });
      }

      // Ejecutar el script Python para extraer datos del PDF
      console.log(`Ejecutando script: ${scriptPath} con archivo: ${rutaArchivo}`);
      
      const { stdout, stderr } = await execFileAsync('python', [scriptPath, rutaArchivo], {
        timeout: 30000 // 30 segundos de timeout
      });

      if (stderr) {
        console.warn('Warning del script Python:', stderr);
      }

      // Parsear el resultado JSON
      let datosExtraidos;
      try {
        datosExtraidos = JSON.parse(stdout);
      } catch (parseError) {
        console.error('Error al parsear JSON del script:', parseError);
        console.error('Salida del script:', stdout);
        return res.status(500).json({ 
          error: 'Error al procesar la respuesta del script de extracción' 
        });
      }

      // Generar número de orden único
      const timestamp = DateUtils.formatDateForInput().replace(/-/g, '');
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const numeroOrden = `OC-${proveedorData.empresa.substring(0, 3).toUpperCase()}-${timestamp}-${random}`;

      // Crear la orden de compra en la base de datos
      const ordenCompra = new OrdenCompra({
        numeroOrden,
        numeroCotizacion: datosExtraidos?.folio || undefined, // Extraer número de cotización del PDF
        fecha: DateUtils.getCurrentDateInMexicali(),
        proveedor: proveedorId,
        razonSocial: razonSocialId,
        vendedor: vendedorId || undefined,
        datosOrden: {
          direccionEnvio,
          productos: datosExtraidos.productos || [],
          totalesCalculados: datosExtraidos.totales || {},
          datosPdf: datosExtraidos,
          datosAdicionales,
          moneda: 'MXN', // Valor por defecto
          porcentajeIvaSimbolico: '16' // Valor por defecto
        }
      });
      
      await ordenCompra.save();
      
      // Preparar datos para generar PDF de orden de compra
      const datosParaPdf = {
        numeroOrden,
        fecha: DateUtils.formatForOrdenCompra(),
        proveedor: proveedorData.toObject(),
        razonSocial: razonSocialData.toObject(),
        vendedor: vendedorData ? vendedorData.toObject() : undefined,
        direccionEnvio,
        productos: datosExtraidos.productos || [],
        totalesCalculados: datosExtraidos.totales || {},
        datosPdf: datosExtraidos,
        datosAdicionales,
        moneda: 'MXN', // Valor por defecto
        porcentajeIvaSimbolico: '16' // Valor por defecto
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
