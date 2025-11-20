import { Request, Response } from 'express';
import { Proyecto, IProyecto } from '../models/Proyecto';
import Colaborador from '../models/Colaborador';
import Cotizacion from '../models/Cotizacion';
import OrdenCompra from '../models/OrdenCompra';
import Entrega from '../models/Entrega';

// Obtener todos los proyectos
export const obtenerProyectos = async (req: Request, res: Response): Promise<void> => {
  try {
    const proyectos = await Proyecto.find()
      .populate('colaboradores', 'nombre numeroEmpleado puesto')
      .sort({ createdAt: -1 });
    res.json(proyectos);
  } catch (error) {
    console.error('Error al obtener proyectos:', error);
    res.status(500).json({ message: 'Error al obtener proyectos', error });
  }
};

// Obtener un proyecto por ID
export const obtenerProyectoPorId = async (req: Request, res: Response): Promise<void> => {
  try {
    const proyecto = await Proyecto.findById(req.params.id)
      .populate('colaboradores', 'nombre numeroEmpleado puesto');
    
    if (!proyecto) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }
    
    res.json(proyecto);
  } catch (error) {
    console.error('Error al obtener proyecto:', error);
    res.status(500).json({ message: 'Error al obtener proyecto', error });
  }
};

// Crear un nuevo proyecto
export const crearProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, fechaInicio, fechaTerminacion, colaboradores, estado, descripcion } = req.body;

    // Validar que el nombre no esté vacío
    if (!nombre || nombre.trim() === '') {
      res.status(400).json({ message: 'El nombre del proyecto es requerido' });
      return;
    }

    // Validar fechas
    if (!fechaInicio || !fechaTerminacion) {
      res.status(400).json({ message: 'Las fechas de inicio y terminación son requeridas' });
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

    const nuevoProyecto = new Proyecto({
      nombre,
      fechaInicio,
      fechaTerminacion,
      colaboradores: colaboradores || [],
      estado: estado || 'En progreso',
      descripcion
    });

    const proyectoGuardado = await nuevoProyecto.save();
    const proyectoPopulado = await Proyecto.findById(proyectoGuardado._id)
      .populate('colaboradores', 'nombre numeroEmpleado puesto');

    res.status(201).json(proyectoPopulado);
  } catch (error) {
    console.error('Error al crear proyecto:', error);
    res.status(500).json({ message: 'Error al crear proyecto', error });
  }
};

// Actualizar un proyecto
export const actualizarProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, fechaInicio, fechaTerminacion, colaboradores, estado, descripcion } = req.body;

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

    const proyectoActualizado = await Proyecto.findByIdAndUpdate(
      req.params.id,
      {
        nombre,
        fechaInicio,
        fechaTerminacion,
        colaboradores,
        estado,
        descripcion
      },
      { new: true, runValidators: true }
    ).populate('colaboradores', 'nombre numeroEmpleado puesto');

    if (!proyectoActualizado) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    res.json(proyectoActualizado);
  } catch (error) {
    console.error('Error al actualizar proyecto:', error);
    res.status(500).json({ message: 'Error al actualizar proyecto', error });
  }
};

// Eliminar un proyecto
export const eliminarProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const proyectoEliminado = await Proyecto.findByIdAndDelete(req.params.id);

    if (!proyectoEliminado) {
      res.status(404).json({ message: 'Proyecto no encontrado' });
      return;
    }

    res.json({ message: 'Proyecto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar proyecto:', error);
    res.status(500).json({ message: 'Error al eliminar proyecto', error });
  }
};

// Obtener cotizaciones de un proyecto
export const obtenerCotizacionesProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const cotizaciones = await Cotizacion.find({ proyecto: req.params.id })
      .populate('cliente')
      .populate('razonSocial')
      .sort({ fechaCreacion: -1 });
    
    res.json(cotizaciones);
  } catch (error) {
    console.error('Error al obtener cotizaciones del proyecto:', error);
    res.status(500).json({ message: 'Error al obtener cotizaciones del proyecto', error });
  }
};

// Obtener órdenes de compra de un proyecto
export const obtenerOrdenesCompraProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const ordenesCompra = await OrdenCompra.find({ proyecto: req.params.id })
      .populate('proveedor')
      .populate('razonSocial')
      .populate('vendedor')
      .sort({ fecha: -1 });
    
    res.json(ordenesCompra);
  } catch (error) {
    console.error('Error al obtener órdenes de compra del proyecto:', error);
    res.status(500).json({ message: 'Error al obtener órdenes de compra del proyecto', error });
  }
};

// Obtener entregas de un proyecto
export const obtenerEntregasProyecto = async (req: Request, res: Response): Promise<void> => {
  try {
    const entregas = await Entrega.find({ proyecto: req.params.id })
      .populate('cliente')
      .populate('razonSocial')
      .sort({ fechaCreacion: -1 });
    
    res.json(entregas);
  } catch (error) {
    console.error('Error al obtener entregas del proyecto:', error);
    res.status(500).json({ message: 'Error al obtener entregas del proyecto', error });
  }
};

