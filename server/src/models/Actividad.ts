import mongoose, { Schema, Document } from 'mongoose';

export interface IEvidenciaActividad {
  _id?: mongoose.Types.ObjectId;
  nombre: string;
  url: string;
  tipo: string;
  tamaño: number;
  fechaSubida: Date;
  subidoPor?: string;
}

export interface IActividad extends Document {
  proyecto: mongoose.Types.ObjectId; // Referencia al proyecto
  descripcion: string;
  fechaInicio: Date;
  fechaFinal: Date;
  estado: 'Pendiente' | 'En progreso' | 'Completada' | 'Cancelada';
  colaboradores: mongoose.Types.ObjectId[]; // Array de IDs de colaboradores
  color?: string; // Color personalizado para la tarjeta
  evidencias?: IEvidenciaActividad[]; // Array de evidencias/fotos
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
    }],
    color: {
      type: String,
      default: '#0d6efd', // Color por defecto (azul)
      trim: true
    },
    evidencias: [{
      nombre: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      tipo: {
        type: String,
        required: true
      },
      tamaño: {
        type: Number,
        required: true
      },
      fechaSubida: {
        type: Date,
        default: Date.now
      },
      subidoPor: {
        type: String
      }
    }]
  },
  {
    timestamps: true
  }
);

// Índice para mejorar búsquedas por proyecto
ActividadSchema.index({ proyecto: 1 });

export const Actividad = mongoose.model<IActividad>('Actividad', ActividadSchema);
