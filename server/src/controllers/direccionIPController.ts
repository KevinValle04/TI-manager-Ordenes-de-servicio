import { Request, Response } from 'express';
import { DireccionIP, IDireccionIP } from '../models/DireccionIP';
import { Proyecto } from '../models/Proyecto';

export const obtenerDireccionesProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proyectoId } = req.params;
    
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    const direcciones = await DireccionIP.find({ proyecto: proyectoId })
      .sort({ createdAt: -1 });
    
    res.json(direcciones);
  } catch (error) {
    console.error('Error al obtener direcciones IP:', error);
    res.status(500).json({ message: 'Error al obtener direcciones IP', error });
  }
};

export const crearDireccionIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proyectoId } = req.params;
    const { equipo, usuario, contrasena, direccion, esRango, direccionFin } = req.body;

    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    if (!equipo || !usuario || !contrasena || !direccion) {
      res.status(400).json({ message: 'Todos los campos son requeridos' });
      return;
    }

    if (esRango && !direccionFin) {
      res.status(400).json({ message: 'Debe especificar la dirección final del rango' });
      return;
    }

    const nuevaDireccion = new DireccionIP({
      proyecto: proyectoId,
      equipo,
      usuario,
      contrasena,
      direccion,
      esRango: esRango || false,
      direccionFin: esRango ? direccionFin : undefined
    });

    const direccionGuardada = await nuevaDireccion.save();
    res.status(201).json(direccionGuardada);
  } catch (error) {
    console.error('Error al crear dirección IP:', error);
    res.status(500).json({ message: 'Error al crear dirección IP', error });
  }
};

export const actualizarDireccionIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { equipo, usuario, contrasena, direccion, esRango, direccionFin } = req.body;

    if (esRango && !direccionFin) {
      res.status(400).json({ message: 'Debe especificar la dirección final del rango' });
      return;
    }

    const direccionActualizada = await DireccionIP.findByIdAndUpdate(
      id,
      {
        equipo,
        usuario,
        contrasena,
        direccion,
        esRango: esRango || false,
        direccionFin: esRango ? direccionFin : undefined
      },
      { new: true, runValidators: true }
    );

    if (!direccionActualizada) {
      res.status(404).json({ message: 'Dirección IP no encontrada' });
      return;
    }

    res.json(direccionActualizada);
  } catch (error) {
    console.error('Error al actualizar dirección IP:', error);
    res.status(500).json({ message: 'Error al actualizar dirección IP', error });
  }
};

export const eliminarDireccionIP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const direccionEliminada = await DireccionIP.findByIdAndDelete(id);

    if (!direccionEliminada) {
      res.status(404).json({ message: 'Dirección IP no encontrada' });
      return;
    }

    res.json({ message: 'Dirección IP eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar dirección IP:', error);
    res.status(500).json({ message: 'Error al eliminar dirección IP', error });
  }
};