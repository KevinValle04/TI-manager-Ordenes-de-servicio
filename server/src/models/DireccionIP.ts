import mongoose, { Schema, Document } from 'mongoose';

export interface IDireccionIP extends Document {
  proyecto: string;
  equipo: string;
  usuario: string;
  contrasena: string;
  direccion: string;
  esRango: boolean;
  direccionFin?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const DireccionIPSchema: Schema = new Schema(
  {
    proyecto: {
      type: Schema.Types.ObjectId,
      ref: 'Proyecto',
      required: true
    },
    equipo: {
      type: String,
      required: true,
      trim: true
    },
    usuario: {
      type: String,
      required: true,
      trim: true
    },
    contrasena: {
      type: String,
      required: true
    },
    direccion: {
      type: String,
      required: true,
      trim: true
    },
    esRango: {
      type: Boolean,
      default: false
    },
    direccionFin: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

export const DireccionIP = mongoose.model<IDireccionIP>('DireccionIP', DireccionIPSchema);
