import { Request, Response } from 'express';
import Entrega, { IEntrega, IItemEntrega } from '../models/Entrega';
import { EntregaPdfGenerator, EntregaPdfData } from '../services/entregaPdfGenerator';

const prepararDatosPdf = (entrega: IEntrega): EntregaPdfData => ({
  numeroEntrega: entrega.numeroEntrega,
  cliente: entrega.cliente,
  fecha: entrega.fecha.toISOString(),
  items: entrega.items.map(item => ({
    clave: item.clave,
    marca: item.marca,
    modelo: item.modelo,
    descripcion: item.concepto,
    cantidad: item.cantidad,
    unidad: item.unidad
  })),
  comentarios: entrega.comentarios,
  razonSocial: entrega.razonSocial as any
});

export const getEntregas = async (req: Request, res: Response) => {
  try {
    const entregas = await Entrega.find()
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa')
      .sort({ fechaActualizacion: -1 });
    res.json(entregas);
  } catch (err) {
    console.error('Error al obtener entregas:', err);
    res.status(500).json({ error: 'Error al obtener entregas' });
  }
};

export const getEntregaById = async (req: Request, res: Response) => {
  try {
    const entrega = await Entrega.findById(req.params.id)
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa emailFacturacion direccionEnvio');
    if (!entrega) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }
    res.json(entrega);
  } catch (err) {
    console.error('Error al obtener entrega:', err);
    res.status(500).json({ error: 'Error al obtener entrega' });
  }
};

export const createEntrega = async (req: Request, res: Response) => {
  try {
    const entregaData = {
      ...req.body,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    const entrega = new Entrega(entregaData);
    await entrega.save();
    
    res.status(201).json(entrega);
  } catch (err) {
    console.error('Error al crear entrega:', err);
    res.status(500).json({ error: 'Error al crear entrega' });
  }
};

export const updateEntrega = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      fechaActualizacion: new Date()
    };
    
    const entrega = await Entrega.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!entrega) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }
    
    res.json(entrega);
  } catch (err) {
    console.error('Error al actualizar entrega:', err);
    res.status(500).json({ error: 'Error al actualizar entrega' });
  }
};

export const deleteEntrega = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entrega = await Entrega.findByIdAndDelete(id);
    
    if (!entrega) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }
    
    res.json({ message: 'Entrega eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar entrega:', err);
    res.status(500).json({ error: 'Error al eliminar entrega' });
  }
};

export const searchEntregas = async (req: Request, res: Response) => {
  try {
    const searchTerm = req.query.term;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Término de búsqueda no proporcionado' });
    }
    
    const entregas = await Entrega.find({
      $or: [
        { numeroEntrega: { $regex: searchTerm, $options: 'i' } },
        { cliente: { $regex: searchTerm, $options: 'i' } }
      ]
    }).populate('razonSocial', 'nombre');
    
    res.json(entregas);
  } catch (err) {
    console.error('Error al buscar entregas:', err);
    res.status(500).json({ error: 'Error al buscar entregas' });
  }
};

// Generar PDF de entrega
export const getPdfEntrega = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entrega = await Entrega.findById(id)
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa');
    
    if (!entrega) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const datosPdf = prepararDatosPdf(entrega);

    const pdfGenerator = new EntregaPdfGenerator();
    const pdfBuffer = await pdfGenerator.generarPdfEntrega(datosPdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Entrega-${entrega.numeroEntrega}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al generar PDF de entrega:', err);
    res.status(500).json({ 
      error: 'Error al generar PDF de entrega',
      detalles: err.message
    });
  }
};

export const descargarPdfEntrega = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const entrega = await Entrega.findById(id)
      .populate('razonSocial', 'nombre rfc emailEmpresa telEmpresa direccionEmpresa');
    
    if (!entrega) {
      return res.status(404).json({ error: 'Entrega no encontrada' });
    }

    const datosPdf = prepararDatosPdf(entrega);

    const pdfGenerator = new EntregaPdfGenerator();
    const pdfBuffer = await pdfGenerator.generarPdfEntrega(datosPdf);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Entrega-${entrega.numeroEntrega}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    
  } catch (err: any) {
    console.error('Error al descargar PDF de entrega:', err);
    res.status(500).json({ 
      error: 'Error al descargar PDF de entrega',
      detalles: err.message
    });
  }
};
