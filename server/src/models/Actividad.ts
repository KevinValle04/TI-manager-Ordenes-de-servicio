import mongoose, { Schema, Document } from 'mongoose';

export interface IActividad extends Document {
  proyecto: mongoose.Types.ObjectId; // Referencia al proyecto
  descripcion: string;
  fechaInicio: Date;
  fechaFinal: Date;
  estado: 'Pendiente' | 'En progreso' | 'Completada' | 'Cancelada';
  colaboradores: mongoose.Types.ObjectId[]; // Array de IDs de colaboradores
  createdAt?: Date;
  updatedAt?: Date;
}

const ActividadSchema: Schema = new Schema(
  {
    proyecto: {
      type: Schema.Types.ObjectId,
      ref: 'Proyecto',
      required: true
    },
    descripcion: {
      type: String,
      required: true,
      trim: true
    },
    fechaInicio: {
      type: Date,
      required: true
    },
    fechaFinal: {
      type: Date,
      required: true
    },
    estado: {
      type: String,
      enum: ['Pendiente', 'En progreso', 'Completada', 'Cancelada'],
      default: 'Pendiente'
    },
    colaboradores: [{
      type: Schema.Types.ObjectId,
      ref: 'Colaborador'
    }]
  },
  {
    timestamps: true
  }
);

// Índice para mejorar búsquedas por proyecto
ActividadSchema.index({ proyecto: 1 });

export const Actividad = mongoose.model<IActividad>('Actividad', ActividadSchema);
