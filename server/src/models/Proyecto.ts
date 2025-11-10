import mongoose, { Schema, Document } from 'mongoose';

export interface IProyecto extends Document {
  nombre: string;
  fechaInicio: Date;
  fechaTerminacion: Date;
  colaboradores: string[]; // Array de IDs de colaboradores
  estado?: 'En progreso' | 'Completado' | 'Pausado' | 'Cancelado';
  descripcion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ProyectoSchema: Schema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    fechaInicio: {
      type: Date,
      required: true
    },
    fechaTerminacion: {
      type: Date,
      required: true
    },
    colaboradores: [{
      type: Schema.Types.ObjectId,
      ref: 'Colaborador'
    }],
    estado: {
      type: String,
      enum: ['En progreso', 'Completado', 'Pausado', 'Cancelado'],
      default: 'En progreso'
    },
    descripcion: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const Proyecto = mongoose.model<IProyecto>('Proyecto', ProyectoSchema);
