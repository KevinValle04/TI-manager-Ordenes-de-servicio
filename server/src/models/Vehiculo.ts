import mongoose, { Schema, Document } from 'mongoose';

export interface IHistorialServicio {
  fecha: Date;
  descripcion?: string;
  kilometraje?: number;
  costo?: number;
  realizadoPor?: string;
}

export interface IVehiculo extends Document {
  marca: string;
  modelo: string;
  año: number;
  color: string;
  placas?: string;
  numeroSerie?: string;
  ultimoServicio?: Date;
  proximoServicio?: Date;
  historialServicios: IHistorialServicio[];
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HistorialServicioSchema = new Schema<IHistorialServicio>({
  fecha: {
    type: Date,
    required: true,
    default: Date.now
  },
  descripcion: {
    type: String,
    trim: true
  },
  kilometraje: {
    type: Number,
    min: 0
  },
  costo: {
    type: Number,
    min: 0
  },
  realizadoPor: {
    type: String,
    trim: true
  }
}, { _id: true });

const VehiculoSchema = new Schema<IVehiculo>({
  marca: {
    type: String,
    required: [true, 'La marca es requerida'],
    trim: true
  },
  modelo: {
    type: String,
    required: [true, 'El modelo es requerido'],
    trim: true
  },
  año: {
    type: Number,
    required: [true, 'El año es requerido'],
    min: [1900, 'El año debe ser mayor a 1900'],
    max: [new Date().getFullYear() + 1, 'El año no puede ser mayor al año actual + 1']
  },
  color: {
    type: String,
    required: [true, 'El color es requerido'],
    trim: true
  },
  placas: {
    type: String,
    trim: true,
    uppercase: true,
    index: true,
    unique: true,
    sparse: true
  },
  numeroSerie: {
    type: String,
    trim: true,
    uppercase: true
  },
  ultimoServicio: {
    type: Date
  },
  proximoServicio: {
    type: Date
  },
  historialServicios: [HistorialServicioSchema],
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices
VehiculoSchema.index({ marca: 1, modelo: 1 });
VehiculoSchema.index({ activo: 1 });

// Método para calcular el próximo servicio (6 meses después)
VehiculoSchema.methods.calcularProximoServicio = function(fechaServicio: Date) {
  const proximaFecha = new Date(fechaServicio);
  proximaFecha.setMonth(proximaFecha.getMonth() + 6);
  return proximaFecha;
};

// Método para verificar si el servicio está vencido
VehiculoSchema.methods.servicioVencido = function() {
  if (!this.proximoServicio) return false;
  return new Date() > this.proximoServicio;
};

// Método para días hasta el próximo servicio
VehiculoSchema.methods.diasHastaServicio = function() {
  if (!this.proximoServicio) return null;
  const ahora = new Date();
  const diferencia = this.proximoServicio.getTime() - ahora.getTime();
  return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
};

const Vehiculo = mongoose.model<IVehiculo>('Vehiculo', VehiculoSchema);

export default Vehiculo;
