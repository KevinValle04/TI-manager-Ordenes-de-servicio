import { Request, Response } from 'express';
import Cotizacion from '../models/Cotizacion';
import { CotizacionPdfGenerator } from '../services/cotizacionPdfGenerator';

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
    const cotizacionData = {
      ...req.body,
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
  } catch (err) {
    console.error('Error al crear cotización:', err);
    res.status(500).json({ error: 'Error al crear cotización' });
  }
};

export const updateCotizacion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      fechaActualizacion: new Date()
    };
    
    const cotizacion = await Cotizacion.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    
    // Recalcular totales si hay items
    if (cotizacion.items && cotizacion.items.length > 0) {
      cotizacion.calcularTotales();
      await cotizacion.save();
    }
    
    res.json(cotizacion);
  } catch (err) {
    console.error('Error al actualizar cotización:', err);
    res.status(500).json({ error: 'Error al actualizar cotización' });
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

    const datosPdf = {
      numeroPresupuesto: cotizacion.numeroPresupuesto,
      cliente: cotizacion.cliente,
      fecha: cotizacion.fecha.toISOString(),
      vigencia: cotizacion.vigencia.toISOString(),
      subtotal: cotizacion.subtotal,
      utilidad: cotizacion.utilidad,
      total: cotizacion.total,
      estado: cotizacion.estado,
      items: cotizacion.items.map(item => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      })),
      comentarios: cotizacion.comentarios,
      razonSocial: cotizacion.razonSocial as any
    };

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

    const datosPdf = {
      numeroPresupuesto: cotizacion.numeroPresupuesto,
      cliente: cotizacion.cliente,
      fecha: cotizacion.fecha.toISOString(),
      vigencia: cotizacion.vigencia.toISOString(),
      subtotal: cotizacion.subtotal,
      utilidad: cotizacion.utilidad,
      total: cotizacion.total,
      estado: cotizacion.estado,
      items: cotizacion.items.map(item => ({
        descripcion: item.descripcion,
        cantidad: item.cantidad,
        unidad: item.unidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal
      })),
      comentarios: cotizacion.comentarios,
      razonSocial: cotizacion.razonSocial as any
    };

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