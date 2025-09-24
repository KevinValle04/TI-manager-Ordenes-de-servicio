import { Schema, model } from 'mongoose';

const solicitudSchema = new Schema({
  tipo: { type: String, required: true }, // 'inventario', 'herramienta', etc.
  recursoId: { type: Schema.Types.Mixed, required: true }, // id del recurso afectado
  colaboradorId: { type: Schema.Types.ObjectId, ref: 'Colaborador', required: true },
  accion: { type: String, required: true }, // 'alta', 'baja', 'asignar', 'remover'
  estado: { type: String, default: 'pendiente' }, // 'pendiente', 'aprobada', 'rechazada'
  fecha: { type: Date, default: Date.now },
  detalles: { type: Schema.Types.Mixed },
  detallesOriginal: { type: Schema.Types.Mixed } // Para solicitudes de modificación
});

export default model('Solicitud', solicitudSchema);