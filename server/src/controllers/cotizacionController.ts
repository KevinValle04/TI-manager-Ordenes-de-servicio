import { Request, Response } from 'express';
import Cotizacion, { ICotizacion } from '../models/Cotizacion';
import { CotizacionPdfData, CotizacionPdfGenerator } from '../services/cotizacionPdfGenerator';

const prepararDatosPdf = (cotizacion: ICotizacion): CotizacionPdfData => ({
  numeroPresupuesto: cotizacion.numeroPresupuesto,
  cliente: cotizacion.cliente,
  fecha: cotizacion.fecha.toISOString(),
  vigencia: cotizacion.vigencia.toISOString(),
  subtotal: cotizacion.subtotal,
  iva: cotizacion.iva,
  ivaImporte: cotizacion.ivaImporte,
  total: cotizacion.total,
  estado: cotizacion.estado,
  items: cotizacion.items.map(item => ({
    descripcion: item.concepto,
    cantidad: item.cantidad,
    unidad: item.unidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.importe,
    aplicarIva: item.aplicarIva || false,
    iva: item.aplicarIva ? item.importe * (cotizacion.iva/100) : 0
  })),
  comentarios: cotizacion.comentarios,
  razonSocial: cotizacion.razonSocial as any
});

export const getCotizaciones = async (req: Request, res: Response) => {
  try {
    const cotizaciones = await Cotizacion.find()
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa')
      .sort({ fechaActualizacion: -1 });
    res.json(cotizaciones);
  } catch (err) {
    console.error('Error al obtener cotizaciones:', err);
    res.status(500).json({ error: 'Error al obtener cotizaciones' });
  }
};

export const getCotizacionById = async (req: Request, res: Response) => {
  try {
    const cotizacion = await Cotizacion.findById(req.params.id)
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa emailFacturacion direccionEnvio');
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    res.json(cotizacion);
  } catch (err) {
    console.error('Error al obtener cotización:', err);
    res.status(500).json({ error: 'Error al obtener cotización' });
  }
};

export const createCotizacion = async (req: Request, res: Response) => {
  try {
    // Validar campos requeridos
    const { cliente, numeroPresupuesto } = req.body;
    
    if (!cliente || cliente.trim() === '') {
      return res.status(400).json({ 
        error: 'Validación fallida', 
        details: 'El campo Cliente es requerido'
      });
    }
    
    if (!numeroPresupuesto || numeroPresupuesto.trim() === '') {
      return res.status(400).json({ 
        error: 'Validación fallida', 
        details: 'El campo Número de Presupuesto es requerido'
      });
    }
    
    // Limpiar datos antes de crear la cotización
    const cotizacionData = {
      ...req.body,
      // Convertir strings vacías a undefined para campos ObjectId opcionales
      razonSocial: req.body.razonSocial && req.body.razonSocial.trim() !== '' ? req.body.razonSocial : undefined,
      proyecto: req.body.proyecto && req.body.proyecto.trim() !== '' ? req.body.proyecto : undefined,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    const cotizacion = new Cotizacion(cotizacionData);
    
    // Calcular totales automáticamente si hay items
    if (cotizacion.items && cotizacion.items.length > 0) {
      cotizacion.calcularTotales();
    }
    
    await cotizacion.save();
    
    res.status(201).json(cotizacion);
  } catch (err: any) {
    console.error('Error al crear cotización:', err);
    
    // Manejar errores de validación de Mongoose
    if (err.name === 'ValidationError') {
      const errores = Object.keys(err.errors).map(key => {
        const error = err.errors[key];
        let mensaje = '';
        
        switch (key) {
          case 'razonSocial':
            mensaje = 'La Razón Social seleccionada no es válida. Por favor, selecciona una razón social de la lista o deja el campo vacío.';
            break;
          case 'proyecto':
            mensaje = 'El Proyecto seleccionado no es válido. Por favor, selecciona un proyecto de la lista o deja el campo vacío.';
            break;
          case 'cliente':
            mensaje = 'El campo Cliente es requerido y no puede estar vacío.';
            break;
          case 'numeroPresupuesto':
            mensaje = 'El campo Número de Presupuesto es requerido y no puede estar vacío.';
            break;
          default:
            mensaje = `Error en el campo ${key}: ${error.message}`;
        }
        
        return { campo: key, mensaje };
      });
      
      return res.status(400).json({ 
        error: 'Error de validación', 
        details: errores.length === 1 ? errores[0].mensaje : 'Múltiples errores de validación',
        errores 
      });
    }
    
    // Error genérico
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: 'No se pudo crear la cotización. Por favor, intenta nuevamente.'
    });
  }
};

export const updateCotizacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validar campos requeridos
    const { cliente, numeroPresupuesto } = req.body;
    
    if (!cliente || cliente.trim() === '') {
      return res.status(400).json({ 
        error: 'Validación fallida', 
        details: 'El campo Cliente es requerido'
      });
    }
    
    if (!numeroPresupuesto || numeroPresupuesto.trim() === '') {
      return res.status(400).json({ 
        error: 'Validación fallida', 
        details: 'El campo Número de Presupuesto es requerido'
      });
    }
    
    // Limpiar datos antes de actualizar
    const updateData = {
      ...req.body,
      // Convertir strings vacías a undefined para campos ObjectId opcionales
      razonSocial: req.body.razonSocial && req.body.razonSocial.trim() !== '' ? req.body.razonSocial : undefined,
      proyecto: req.body.proyecto && req.body.proyecto.trim() !== '' ? req.body.proyecto : undefined,
      fechaActualizacion: new Date()
    };
    
    const cotizacion = await Cotizacion.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!cotizacion) {
      return res.status(404).json({ 
        error: 'Cotización no encontrada',
        details: 'No se encontró una cotización con el ID especificado'
      });
    }
    
    // Recalcular totales si hay items
    if (cotizacion.items && cotizacion.items.length > 0) {
      cotizacion.calcularTotales();
      await cotizacion.save();
    }
    
    res.json(cotizacion);
  } catch (err: any) {
    console.error('Error al actualizar cotización:', err);
    
    // Manejar errores de validación de Mongoose
    if (err.name === 'ValidationError') {
      const errores = Object.keys(err.errors).map(key => {
        const error = err.errors[key];
        let mensaje = '';
        
        switch (key) {
          case 'razonSocial':
            mensaje = 'La Razón Social seleccionada no es válida. Por favor, selecciona una razón social de la lista o deja el campo vacío.';
            break;
          case 'proyecto':
            mensaje = 'El Proyecto seleccionado no es válido. Por favor, selecciona un proyecto de la lista o deja el campo vacío.';
            break;
          case 'cliente':
            mensaje = 'El campo Cliente es requerido y no puede estar vacío.';
            break;
          case 'numeroPresupuesto':
            mensaje = 'El campo Número de Presupuesto es requerido y no puede estar vacío.';
            break;
          default:
            mensaje = `Error en el campo ${key}: ${error.message}`;
        }
        
        return { campo: key, mensaje };
      });
      
      return res.status(400).json({ 
        error: 'Error de validación', 
        details: errores.length === 1 ? errores[0].mensaje : 'Múltiples errores de validación',
        errores 
      });
    }
    
    // Error genérico
    res.status(500).json({ 
      error: 'Error interno del servidor', 
      details: 'No se pudo actualizar la cotización. Por favor, intenta nuevamente.'
    });
  }
};

export const deleteCotizacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cotizacion = await Cotizacion.findByIdAndDelete(id);
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    
    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar cotización:', err);
    res.status(500).json({ error: 'Error al eliminar cotización' });
  }
};

export const searchCotizaciones = async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.term;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Término de búsqueda no proporcionado' });
    }
    
    const cotizaciones = await Cotizacion.find({
      $or: [
        { numeroPresupuesto: { $regex: searchTerm, $options: 'i' } },
        { cliente: { $regex: searchTerm, $options: 'i' } },
        { estado: { $regex: searchTerm, $options: 'i' } }
      ]
    }).populate('razonSocial', 'nombre');
    
    res.json(cotizaciones);
  } catch (err) {
    console.error('Error al buscar cotizaciones:', err);
    res.status(500).json({ error: 'Error al buscar cotizaciones' });
  }
};

export const cambiarEstadoCotizacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    
    if (!estado) {
      return res.status(400).json({ error: 'Estado no proporcionado' });
    }
    
    const cotizacion = await Cotizacion.findByIdAndUpdate(
      id,
      { estado, fechaActualizacion: new Date() },
      { new: true }
    );
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    
    res.json(cotizacion);
  } catch (err) {
    console.error('Error al cambiar estado de cotización:', err);
    res.status(500).json({ error: 'Error al cambiar estado de cotización' });
  }
};

// Generar PDF de cotización
export const getPdfCotizacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const cotizacion = await Cotizacion.findById(id)
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa');
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const datosPdf = prepararDatosPdf(cotizacion);

    const pdfGenerator = new CotizacionPdfGenerator();
    const pdfBuffer = await pdfGenerator.generarPdfCotizacion(datosPdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Cotizacion-${cotizacion.numeroPresupuesto}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al generar PDF de cotización:', err);
    res.status(500).json({ 
      error: 'Error al generar PDF de cotización',
      detalles: err.message
    });
  }
};

export const descargarPdfCotizacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const cotizacion = await Cotizacion.findById(id)
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa');
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    const datosPdf = prepararDatosPdf(cotizacion);

    const pdfGenerator = new CotizacionPdfGenerator();
    const pdfBuffer = await pdfGenerator.generarPdfCotizacion(datosPdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Cotizacion-${cotizacion.numeroPresupuesto}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al descargar PDF de cotización:', err);
    res.status(500).json({ 
      error: 'Error al descargar PDF de cotización',
      detalles: err.message
    });
  }
};