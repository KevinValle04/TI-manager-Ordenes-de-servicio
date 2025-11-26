import { Request, Response } from 'express';
import { Actividad, IActividad } from '../models/Actividad';
import Colaborador from '../models/Colaborador';
import { Proyecto } from '../models/Proyecto';

// Obtener todas las actividades de un proyecto
export const obtenerActividadesProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proyectoId } = req.params;

    // Verificar que el proyecto existe
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    const actividades = await Actividad.find({ proyecto: proyectoId })
      .populate('colaboradores', 'nombre numeroEmpleado puesto')
      .sort({ fechaInicio: -1 });
    
    res.json(actividades);
  } catch (error) {
    console.error('Error al obtener actividades:', error);
    res.status(500).json({ message: 'Error al obtener actividades', error });
  }
};

// Obtener una actividad por ID
export const obtenerActividadPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const actividad = await Actividad.findById(req.params.id)
      .populate('colaboradores', 'nombre numeroEmpleado puesto')
      .populate('proyecto', 'nombre');
    
    if (!actividad) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }
    
    res.json(actividad);
  } catch (error) {
    console.error('Error al obtener actividad:', error);
    res.status(500).json({ message: 'Error al obtener actividad', error });
  }
};

// Crear una nueva actividad
export const crearActividad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proyectoId } = req.params;
    const { descripcion, fechaInicio, fechaFinal, estado, colaboradores, color } = req.body;

    // Verificar que el proyecto existe
    const proyecto = await Proyecto.findById(proyectoId);
    if (!proyecto) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    // Validar campos requeridos
    if (!descripcion || descripcion.trim() === '') {
      res.status(400).json({ message: 'La descripción de la actividad es requerida' });
      return;
    }

    if (!fechaInicio || !fechaFinal) {
      res.status(400).json({ message: 'Las fechas de inicio y final son requeridas' });
      return;
    }

    // Validar que los colaboradores existen
    if (colaboradores && colaboradores.length > 0) {
      const colaboradoresExistentes = await Colaborador.find({
        _id: { $in: colaboradores }
      });

      if (colaboradoresExistentes.length !== colaboradores.length) {
        res.status(400).json({ message: 'Uno o más colaboradores no existen' });
        return;
      }
    }

    const nuevaActividad = new Actividad({
      proyecto: proyectoId,
      descripcion,
      fechaInicio,
      fechaFinal,
      estado: estado || 'Pendiente',
      colaboradores: colaboradores || [],
      color: color || '#0d6efd'
    });

    const actividadGuardada = await nuevaActividad.save();
    const actividadPopulada = await Actividad.findById(actividadGuardada._id)
      .populate('colaboradores', 'nombre numeroEmpleado puesto')
      .populate('proyecto', 'nombre');

    res.status(201).json(actividadPopulada);
  } catch (error) {
    console.error('Error al crear actividad:', error);
    res.status(500).json({ message: 'Error al crear actividad', error });
  }
};

// Actualizar una actividad
export const actualizarActividad = async (req: Request, res: Response): Promise<void> => {
  try {
    const { descripcion, fechaInicio, fechaFinal, estado, colaboradores, color } = req.body;

    // Validar que los colaboradores existen
    if (colaboradores && colaboradores.length > 0) {
      const colaboradoresExistentes = await Colaborador.find({
        _id: { $in: colaboradores }
      });

      if (colaboradoresExistentes.length !== colaboradores.length) {
        res.status(400).json({ message: 'Uno o más colaboradores no existen' });
        return;
      }
    }

    const actividadActualizada = await Actividad.findByIdAndUpdate(
      req.params.id,
      {
        descripcion,
        fechaInicio,
        fechaFinal,
        estado,
        colaboradores,
        color
      },
      { new: true, runValidators: true }
    )
      .populate('colaboradores', 'nombre numeroEmpleado puesto')
      .populate('proyecto', 'nombre');

    if (!actividadActualizada) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    res.json(actividadActualizada);
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    res.status(500).json({ message: 'Error al actualizar actividad', error });
  }
};

// Eliminar una actividad
export const eliminarActividad = async (req: Request, res: Response): Promise<void> => {
  try {
    const actividadEliminada = await Actividad.findByIdAndDelete(req.params.id);

    if (!actividadEliminada) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    res.json({ message: 'Actividad eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ message: 'Error al eliminar actividad', error });
  }
};
