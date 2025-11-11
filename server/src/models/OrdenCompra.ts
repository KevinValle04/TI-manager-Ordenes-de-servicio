import mongoose, { Schema, Document } from 'mongoose';

export interface IOrdenCompra extends Document {
  numeroOrden: string;
  numeroCotizacion?: string; // Número de cotización extraído del PDF
  fecha: Date;
  proveedor: mongoose.Types.ObjectId;
  razonSocial: mongoose.Types.ObjectId;
  vendedor?: mongoose.Types.ObjectId;
  proyecto?: mongoose.Types.ObjectId; // Referencia al proyecto (opcional)
  datosOrden: any; // JSON flexible que puede variar en estructura
  rutaPdf?: string; // Ruta donde se guardó el PDF generado
}

const OrdenCompraSchema: Schema = new Schema({
  numeroOrden: { 
    type: String, 
    
    unique: true,
    trim: true
  },
  numeroCotizacion: {
    type: String,
    required: false,
    trim: true
  },
  fecha: { 
    type: Date, 
    
    default: Date.now
  },
  proveedor: { 
    type: Schema.Types.ObjectId, 
    ref: 'Proveedor', 
    
  },
  razonSocial: { 
    type: Schema.Types.ObjectId, 
    ref: 'RazonSocial', 
    
  },
  vendedor: { 
    type: Schema.Types.ObjectId, 
    ref: 'Vendedor', 
    required: false
  },
  proyecto: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto',
    required: false
  },
  datosOrden: { 
    type: Schema.Types.Mixed, 
    
  },
  rutaPdf: {
    type: String,
    required: false // Opcional, ya que puede no haberse generado PDF
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
// Nota: numeroOrden ya tiene índice único automático por unique: true
OrdenCompraSchema.index({ fecha: -1 });
OrdenCompraSchema.index({ proveedor: 1 });
OrdenCompraSchema.index({ razonSocial: 1 });
OrdenCompraSchema.index({ vendedor: 1 });

export default mongoose.model<IOrdenCompra>('OrdenCompra', OrdenCompraSchema);
