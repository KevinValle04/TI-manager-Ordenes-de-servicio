import { Request, Response } from 'express';
import Entrega, { IEntrega, IItemEntrega } from '../models/Entrega';
import { EntregaPdfGenerator, EntregaPdfData } from '../services/entregaPdfGenerator';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryMovement } from '../models/InventoryMovement';

const prepararDatosPdf = (entrega: IEntrega, clienteInfo?: any): EntregaPdfData => {
  return {
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
    clienteInfo: clienteInfo,
    razonSocial: entrega.razonSocial as any
  };
};

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
    console.log('===== CREATE ENTREGA =====');
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));
    
    // Limpiar campos opcionales que vienen como strings vacíos
    const cleanedBody = {
      ...req.body,
      razonSocial: req.body.razonSocial && req.body.razonSocial.trim() !== '' ? req.body.razonSocial : undefined,
      proyecto: req.body.proyecto && req.body.proyecto.trim() !== '' ? req.body.proyecto : undefined,
      comentarios: req.body.comentarios && req.body.comentarios.trim() !== '' ? req.body.comentarios : undefined
    };
    
    const entregaData = {
      ...cleanedBody,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    console.log('Datos limpiados a guardar:', JSON.stringify(entregaData, null, 2));
    
    const entrega = new Entrega(entregaData);
    await entrega.save();
    
    // Procesar items para disminuir inventario y registrar movimientos
    if (entrega.items && entrega.items.length > 0) {
      for (const item of entrega.items) {
        if (item.inventarioItemId) {
          // Disminuir cantidad en inventario
          const inventarioItem = await InventoryItem.findById(item.inventarioItemId);
          if (inventarioItem) {
            inventarioItem.cantidad = Math.max(0, inventarioItem.cantidad - item.cantidad);
            await inventarioItem.save();
            
            // Registrar movimiento de salida
            const movimiento = new InventoryMovement({
              itemId: item.inventarioItemId,
              tipo: 'salida',
              cantidad: item.cantidad,
              fecha: new Date(),
              comentario: `Entrega: ${entrega.numeroEntrega} - ${entrega.cliente}`,
              usuario: (req as any).user?.nombre || 'Sistema'
            });
            await movimiento.save();
            
            console.log(`Inventario actualizado para item ${item.inventarioItemId}: ${inventarioItem.cantidad}`);
          }
        }
      }
    }
    
    console.log('Entrega guardada exitosamente:', entrega._id);
    console.log('=========================');
    
    res.status(201).json(entrega);
  } catch (err: any) {
    console.error('===== ERROR AL CREAR ENTREGA =====');
    console.error('Error completo:', err);
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);
    if (err.errors) {
      console.error('Errores de validación:', JSON.stringify(err.errors, null, 2));
    }
    console.error('==================================');
    res.status(500).json({ error: 'Error al crear entrega', detalles: err.message });
  }
};

export const updateEntrega = async (req: Request, res: Response) => {
  try {
    console.log('===== UPDATE ENTREGA =====');
    console.log('ID:', req.params.id);
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));
    
    const { id } = req.params;
    
    // Limpiar campos opcionales que vienen como strings vacíos
    const cleanedBody = {
      ...req.body,
      razonSocial: req.body.razonSocial && req.body.razonSocial.trim() !== '' ? req.body.razonSocial : undefined,
      proyecto: req.body.proyecto && req.body.proyecto.trim() !== '' ? req.body.proyecto : undefined,
      comentarios: req.body.comentarios && req.body.comentarios.trim() !== '' ? req.body.comentarios : undefined
    };
    
    const updateData = {
      ...cleanedBody,
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
    
    console.log('Entrega actualizada exitosamente');
    console.log('=========================');
    
    res.json(entrega);
  } catch (err: any) {
    console.error('===== ERROR AL ACTUALIZAR ENTREGA =====');
    console.error('Error completo:', err);
    console.error('Mensaje:', err.message);
    if (err.errors) {
      console.error('Errores de validación:', JSON.stringify(err.errors, null, 2));
    }
    console.error('==================================');
    res.status(500).json({ error: 'Error al actualizar entrega', detalles: err.message });
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

    // Obtener información del cliente desde la BD
    const Cliente = require('../models/Cliente').default;
    const clienteDoc = await Cliente.findOne({ nombreEmpresa: entrega.cliente });
    
    // Convertir documento de Mongoose a objeto plano para Handlebars
    const clienteInfo = clienteDoc ? clienteDoc.toObject() : null;
    
    console.log('===== DEBUG PDF ENTREGA =====');
    console.log('Cliente buscado:', entrega.cliente);
    console.log('Cliente encontrado:', clienteInfo ? 'SÍ' : 'NO');
    if (clienteInfo) {
      console.log('Cliente completo:', JSON.stringify(clienteInfo, null, 2));
    }
    console.log('============================');

    const datosPdf = prepararDatosPdf(entrega, clienteInfo);

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

    // Obtener información del cliente desde la BD
    const Cliente = require('../models/Cliente').default;
    const clienteDoc = await Cliente.findOne({ nombreEmpresa: entrega.cliente });
    
    // Convertir documento de Mongoose a objeto plano para Handlebars
    const clienteInfo = clienteDoc ? clienteDoc.toObject() : null;
    
    console.log('===== DEBUG DESCARGA PDF =====');
    console.log('Cliente buscado:', entrega.cliente);
    console.log('Cliente encontrado:', clienteInfo ? 'SÍ' : 'NO');
    if (clienteInfo) {
      console.log('Datos cliente:', clienteInfo);
    }
    console.log('============================');

    const datosPdf = prepararDatosPdf(entrega, clienteInfo);

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
