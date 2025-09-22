import Solicitud from '../models/Solicitud';
import { Request, Response } from 'express';

export const crearSolicitud = async (req: Request, res: Response) => {
  try {
    const solicitud = new Solicitud(req.body);
    await solicitud.save();
    res.status(201).json(solicitud);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear solicitud', details: err });
  }
};

export const obtenerSolicitudes = async (req: Request, res: Response) => {
  try {
    // Obtener solicitudes y hacer populate solo si recursoId es un ObjectId válido
    const mongoose = require('mongoose');
    let solicitudes = await Solicitud.find().populate('colaboradorId', 'nombre');

    // Populate manual para recursoId si es ObjectId válido y tipo herramienta
    const Herramienta = require('../models/Herramienta').default;
    solicitudes = await Promise.all(solicitudes.map(async (sol: any) => {
      let recurso = null;
      if (sol.tipo === 'herramienta' && mongoose.Types.ObjectId.isValid(sol.recursoId)) {
        recurso = await Herramienta.findById(sol.recursoId).select('nombre marca modelo serialNumber valor');
      }
      return { ...sol.toObject(), recurso }; 
    }));

    // Mapear para mostrar datos desde detalles si la herramienta aún no existe
    const solicitudesConDatos = solicitudes.map((sol: any) => {
      let colaboradorNombre = '';
      // Si el populate funcionó, usamos el nombre
      if (sol.colaboradorId && typeof sol.colaboradorId === 'object' && 'nombre' in sol.colaboradorId) {
        colaboradorNombre = (sol.colaboradorId as any).nombre;
      } else if (typeof sol.colaboradorId === 'string') {
        // Si no, usamos el id como fallback
        colaboradorNombre = sol.colaboradorId;
      }

      let recursoNombre = '';
      let marca = '';
      let modelo = '';
      let serialNumber = '';
      let valor = '';

      if (sol.recurso) {
        recursoNombre = sol.recurso.nombre;
        marca = sol.recurso.marca;
        modelo = sol.recurso.modelo;
        serialNumber = sol.recurso.serialNumber;
        valor = sol.recurso.valor;
      } else if (sol.detalles) {
        recursoNombre = sol.detalles.nombre || '';
        marca = sol.detalles.marca || '';
        modelo = sol.detalles.modelo || '';
        serialNumber = sol.detalles.serialNumber || '';
        valor = sol.detalles.valor || '';
      }

      return {
        ...sol,
        colaboradorNombre,
        accion: sol.accion,
        recursoNombre,
        marca,
        modelo,
        serialNumber,
        valor
      };
    });
    res.json(solicitudesConDatos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const actualizarSolicitud = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const solicitud = await Solicitud.findByIdAndUpdate(id, updateData, { new: true });

    // Si la solicitud fue aprobada, procesar la acción
    if (updateData.estado === 'aprobada' && solicitud) {
      const Herramienta = require('../models/Herramienta').default;
      if (solicitud.tipo === 'herramienta') {
        if (solicitud.accion === 'Agregar') {
          // Crear la herramienta y asociarla al colaborador
          const detalles = solicitud.detalles || {};
          const nuevaHerramienta = new Herramienta({
            nombre: detalles.nombre,
            marca: detalles.marca,
            modelo: detalles.modelo,
            valor: detalles.valor,
            serialNumber: detalles.serialNumber,
            colaboradorId: solicitud.colaboradorId,
            fechaAsignacion: new Date(),
            activo: true
          });
          await nuevaHerramienta.save();
          // Actualizar recursoId en la solicitud
          solicitud.recursoId = nuevaHerramienta._id;
          await solicitud.save();
        } else if (solicitud.accion === 'Regresar') {
          // Marcar la herramienta como inactiva
          if (solicitud.recursoId) {
            await Herramienta.findByIdAndUpdate(solicitud.recursoId, { activo: false });
          }
        }
      }
    }
    res.json(solicitud);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar solicitud' });
  }
};

export const eliminarSolicitud = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Solicitud.findByIdAndDelete(id);
    res.json({ message: 'Solicitud eliminada' });
  } catch (err) {
    res.status(400).json({ error: 'Error al eliminar solicitud' });
  }
};