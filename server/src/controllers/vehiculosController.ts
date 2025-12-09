import { Request, Response } from 'express';
import Vehiculo, { IVehiculo, IHistorialServicio } from '../models/Vehiculo';

// Obtener todos los vehículos
export const getVehiculos = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehiculos = await Vehiculo.find({ activo: true }).sort({ createdAt: -1 });
    res.json(vehiculos);
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({ mensaje: 'Error al obtener vehículos' });
  }
};

// Obtener un vehículo por ID
export const getVehiculoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vehiculo = await Vehiculo.findById(id);
    
    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' });
      return;
    }
    
    res.json(vehiculo);
  } catch (error) {
    console.error('Error al obtener vehículo:', error);
    res.status(500).json({ mensaje: 'Error al obtener vehículo' });
  }
};

// Crear un nuevo vehículo
export const createVehiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { marca, modelo, año, color, placas, numeroSerie } = req.body;
    
    // Validaciones básicas
    if (!marca || !modelo || !año || !color) {
      res.status(400).json({ mensaje: 'Marca, modelo, año y color son requeridos' });
      return;
    }
    
    // Verificar si ya existe un vehículo con las mismas placas
    if (placas) {
      const vehiculoExistente = await Vehiculo.findOne({ placas, activo: true });
      if (vehiculoExistente) {
        res.status(400).json({ mensaje: 'Ya existe un vehículo con esas placas' });
        return;
      }
    }
    
    const nuevoVehiculo = new Vehiculo({
      marca,
      modelo,
      año,
      color,
      placas,
      numeroSerie
    });
    
    await nuevoVehiculo.save();
    res.status(201).json(nuevoVehiculo);
  } catch (error: any) {
    console.error('Error al crear vehículo:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ mensaje: error.message });
      return;
    }
    res.status(500).json({ mensaje: 'Error al crear vehículo' });
  }
};

// Actualizar un vehículo
export const updateVehiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { marca, modelo, año, color, placas, numeroSerie } = req.body;
    
    const vehiculo = await Vehiculo.findById(id);
    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' });
      return;
    }
    
    // Verificar placas duplicadas si se están actualizando
    if (placas && placas !== vehiculo.placas) {
      const vehiculoExistente = await Vehiculo.findOne({ 
        placas, 
        activo: true,
        _id: { $ne: id }
      });
      if (vehiculoExistente) {
        res.status(400).json({ mensaje: 'Ya existe un vehículo con esas placas' });
        return;
      }
    }
    
    vehiculo.marca = marca || vehiculo.marca;
    vehiculo.modelo = modelo || vehiculo.modelo;
    vehiculo.año = año || vehiculo.año;
    vehiculo.color = color || vehiculo.color;
    vehiculo.placas = placas !== undefined ? placas : vehiculo.placas;
    vehiculo.numeroSerie = numeroSerie !== undefined ? numeroSerie : vehiculo.numeroSerie;
    
    await vehiculo.save();
    res.json(vehiculo);
  } catch (error: any) {
    console.error('Error al actualizar vehículo:', error);
    if (error.name === 'ValidationError') {
      res.status(400).json({ mensaje: error.message });
      return;
    }
    res.status(500).json({ mensaje: 'Error al actualizar vehículo' });
  }
};

// Eliminar (desactivar) un vehículo
export const deleteVehiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const vehiculo = await Vehiculo.findById(id);
    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' });
      return;
    }
    
    vehiculo.activo = false;
    await vehiculo.save();
    
    res.json({ mensaje: 'Vehículo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar vehículo:', error);
    res.status(500).json({ mensaje: 'Error al eliminar vehículo' });
  }
};

// Registrar un servicio
export const registrarServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fecha, descripcion, kilometraje, costo, realizadoPor } = req.body;
    
    const vehiculo = await Vehiculo.findById(id);
    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' });
      return;
    }
    
    const fechaServicio = fecha ? new Date(fecha) : new Date();
    
    // Crear el registro de servicio
    const nuevoServicio: IHistorialServicio = {
      fecha: fechaServicio,
      descripcion,
      kilometraje,
      costo,
      realizadoPor
    };
    
    // Agregar al historial
    vehiculo.historialServicios.push(nuevoServicio);
    
    // Actualizar fecha de último servicio
    vehiculo.ultimoServicio = fechaServicio;
    
    // Calcular próximo servicio (6 meses después)
    const proximaFecha = new Date(fechaServicio);
    proximaFecha.setMonth(proximaFecha.getMonth() + 6);
    vehiculo.proximoServicio = proximaFecha;
    
    await vehiculo.save();
    
    res.json({
      mensaje: 'Servicio registrado exitosamente',
      vehiculo,
      servicioRegistrado: nuevoServicio
    });
  } catch (error) {
    console.error('Error al registrar servicio:', error);
    res.status(500).json({ mensaje: 'Error al registrar servicio' });
  }
};

// Obtener historial de servicios de un vehículo
export const getHistorialServicios = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const vehiculo = await Vehiculo.findById(id);
    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' });
      return;
    }
    
    res.json({
      vehiculo: {
        _id: vehiculo._id,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        año: vehiculo.año,
        placas: vehiculo.placas
      },
      historialServicios: vehiculo.historialServicios.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )
    });
  } catch (error) {
    console.error('Error al obtener historial de servicios:', error);
    res.status(500).json({ mensaje: 'Error al obtener historial de servicios' });
  }
};

// Obtener vehículos con servicios próximos a vencer (menos de 30 días)
export const getVehiculosProximosAServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    
    const vehiculos = await Vehiculo.find({
      activo: true,
      proximoServicio: { $lte: fechaLimite, $gte: new Date() }
    }).sort({ proximoServicio: 1 });
    
    res.json(vehiculos);
  } catch (error) {
    console.error('Error al obtener vehículos próximos a servicio:', error);
    res.status(500).json({ mensaje: 'Error al obtener vehículos próximos a servicio' });
  }
};

// Obtener vehículos con servicios vencidos
export const getVehiculosServicioVencido = async (req: Request, res: Response): Promise<void> => {
  try {
    const vehiculos = await Vehiculo.find({
      activo: true,
      proximoServicio: { $lt: new Date() }
    }).sort({ proximoServicio: 1 });
    
    res.json(vehiculos);
  } catch (error) {
    console.error('Error al obtener vehículos con servicio vencido:', error);
    res.status(500).json({ mensaje: 'Error al obtener vehículos con servicio vencido' });
  }
};

// Eliminar un servicio del historial
export const eliminarServicio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, servicioId } = req.params;
    
    const vehiculo = await Vehiculo.findById(id);
    if (!vehiculo) {
      res.status(404).json({ mensaje: 'Vehículo no encontrado' });
      return;
    }
    
    // Filtrar el servicio a eliminar
    vehiculo.historialServicios = vehiculo.historialServicios.filter(
      (servicio: any) => servicio._id.toString() !== servicioId
    );
    
    // Recalcular último servicio y próximo servicio basado en el historial restante
    if (vehiculo.historialServicios.length > 0) {
      const serviciosOrdenados = [...vehiculo.historialServicios].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      const ultimoServicioRestante = serviciosOrdenados[0];
      vehiculo.ultimoServicio = ultimoServicioRestante.fecha;
      const proximaFecha = new Date(ultimoServicioRestante.fecha);
      proximaFecha.setMonth(proximaFecha.getMonth() + 6);
      vehiculo.proximoServicio = proximaFecha;
    } else {
      vehiculo.ultimoServicio = undefined;
      vehiculo.proximoServicio = undefined;
    }
    
    await vehiculo.save();
    
    res.json({
      mensaje: 'Servicio eliminado exitosamente',
      vehiculo
    });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    res.status(500).json({ mensaje: 'Error al eliminar servicio' });
  }
};
