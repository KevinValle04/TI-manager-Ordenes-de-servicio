import { Request, Response } from 'express';
import { Actividad, IActividad } from '../models/Actividad';
import Colaborador from '../models/Colaborador';
import { Proyecto } from '../models/Proyecto';
import path from 'path';
import fs from 'fs/promises';
import mongoose from 'mongoose';

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

    // Eliminar archivos de evidencias si existen
    if (actividadEliminada.evidencias && actividadEliminada.evidencias.length > 0) {
      for (const evidencia of actividadEliminada.evidencias) {
        try {
          const filePath = path.join(__dirname, '../../uploads/evidencias', path.basename(evidencia.url));
          await fs.unlink(filePath);
        } catch (error) {
          console.error('Error al eliminar archivo de evidencia:', error);
        }
      }
    }

    res.json({ message: 'Actividad eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar actividad:', error);
    res.status(500).json({ message: 'Error al eliminar actividad', error });
  }
};

// Subir evidencia (imagen) a una actividad
export const subirEvidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: 'No se ha proporcionado ningún archivo' });
      return;
    }

    // Verificar que la actividad existe
    const actividad = await Actividad.findById(id);
    if (!actividad) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    // Crear objeto de evidencia
    const nuevaEvidencia = {
      _id: new mongoose.Types.ObjectId(),
      nombre: file.originalname,
      url: `/api/uploads/evidencias/${file.filename}`,
      tipo: file.mimetype,
      tamaño: file.size,
      fechaSubida: new Date(),
      subidoPor: req.body.subidoPor || 'Sistema'
    };

    // Agregar evidencia al array
    if (!actividad.evidencias) {
      actividad.evidencias = [];
    }
    actividad.evidencias.push(nuevaEvidencia);

    await actividad.save();

    res.status(201).json({
      message: 'Evidencia subida exitosamente',
      evidencia: nuevaEvidencia
    });
  } catch (error) {
    console.error('Error al subir evidencia:', error);
    res.status(500).json({ message: 'Error al subir evidencia', error });
  }
};

// Eliminar una evidencia de una actividad
export const eliminarEvidencia = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, evidenciaId } = req.params;

    // Buscar la actividad
    const actividad = await Actividad.findById(id);
    if (!actividad) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    // Buscar la evidencia
    const evidenciaIndex = actividad.evidencias?.findIndex(
      (e: any) => e._id?.toString() === evidenciaId
    );

    if (evidenciaIndex === undefined || evidenciaIndex === -1) {
      res.status(404).json({ message: 'Evidencia no encontrada' });
      return;
    }

    const evidencia = actividad.evidencias![evidenciaIndex];

    // Eliminar el archivo físico
    try {
      const filePath = path.join(__dirname, '../../uploads/evidencias', path.basename(evidencia.url));
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error al eliminar archivo físico:', error);
      // Continuar aunque falle la eliminación del archivo
    }

    // Eliminar evidencia del array
    actividad.evidencias!.splice(evidenciaIndex, 1);
    await actividad.save();

    res.json({ message: 'Evidencia eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar evidencia:', error);
    res.status(500).json({ message: 'Error al eliminar evidencia', error });
  }
};

// Agregar una nota a una actividad
export const agregarNota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { texto, creadoPor } = req.body;

    if (!texto || texto.trim() === '') {
      res.status(400).json({ message: 'El texto de la nota es requerido' });
      return;
    }

    // Verificar que la actividad existe
    const actividad = await Actividad.findById(id);
    if (!actividad) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    // Crear objeto de nota
    const nuevaNota = {
      _id: new mongoose.Types.ObjectId(),
      texto: texto.trim(),
      fechaCreacion: new Date(),
      creadoPor: creadoPor || 'Sistema'
    };

    // Agregar nota al array
    if (!actividad.notas) {
      actividad.notas = [];
    }
    actividad.notas.push(nuevaNota);

    await actividad.save();

    res.status(201).json({
      message: 'Nota agregada exitosamente',
      nota: nuevaNota
    });
  } catch (error) {
    console.error('Error al agregar nota:', error);
    res.status(500).json({ message: 'Error al agregar nota', error });
  }
};

// Eliminar una nota de una actividad
export const eliminarNota = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, notaId } = req.params;

    // Buscar la actividad
    const actividad = await Actividad.findById(id);
    if (!actividad) {
      res.status(404).json({ message: 'Actividad no encontrada' });
      return;
    }

    // Buscar la nota
    const notaIndex = actividad.notas?.findIndex(
      (n: any) => n._id?.toString() === notaId
    );

    if (notaIndex === undefined || notaIndex === -1) {
      res.status(404).json({ message: 'Nota no encontrada' });
      return;
    }

    // Eliminar nota del array
    actividad.notas!.splice(notaIndex, 1);
    await actividad.save();

    res.json({ message: 'Nota eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar nota:', error);
    res.status(500).json({ message: 'Error al eliminar nota', error });
  }
};
