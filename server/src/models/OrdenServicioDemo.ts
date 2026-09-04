import mongoose, { Schema, Document } from 'mongoose';

// Orden de servicio generada desde la demo (ordenes-servicio-demo)
// Las fotos y firmas se almacenan como dataURL base64 (ya comprimidas en el cliente)
export interface IOrdenServicioDemo extends Document {
  username: string;
  nombre: string;
  folio: string;
  tipos: string[];
  numeroOrdenCliente: string;
  fecha: string;
  cliente: string;
  direccion: string;
  email: string;
  sucursal: string;
  telefono: string;
  actividades: string;
  solucion: string;
  presupuesto: string;
  anticipo: string;
  saldo: string;
  satisfaccion: string;
  horaInicio: string;
  horaFin: string;
  photos: string[];
  firmaTecnico: string;
  firmaCliente: string;
  guardadaEn: Date;
}

const OrdenServicioDemoSchema = new Schema({
  username: { type: String, required: true, index: true },
  nombre: { type: String, default: '' },
  folio: { type: String, required: true },
  tipos: { type: [String], default: [] },
  numeroOrdenCliente: { type: String, default: '' },
  fecha: { type: String, default: '' },
  cliente: { type: String, default: '' },
  direccion: { type: String, default: '' },
  email: { type: String, default: '' },
  sucursal: { type: String, default: '' },
  telefono: { type: String, default: '' },
  actividades: { type: String, default: '' },
  solucion: { type: String, default: '' },
  presupuesto: { type: String, default: '' },
  anticipo: { type: String, default: '' },
  saldo: { type: String, default: '' },
  satisfaccion: { type: String, default: '' },
  horaInicio: { type: String, default: '' },
  horaFin: { type: String, default: '' },
  photos: { type: [String], default: [] },
  firmaTecnico: { type: String, default: '' },
  firmaCliente: { type: String, default: '' },
  guardadaEn: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model<IOrdenServicioDemo>('OrdenServicioDemo', OrdenServicioDemoSchema);