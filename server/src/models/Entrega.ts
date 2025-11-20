import mongoose, { Schema, Document } from 'mongoose';

export interface IEntrega extends Document {
  numeroPresupuesto: string;
  cliente: string;
  razonSocial?: string; // Referencia al ID de la razón social (opcional)
  proyecto?: string; // Referencia al ID del proyecto (opcional)
  fecha: Date;
  items: IItemEntrega[];
  comentarios?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  ultimaClave: number; // Para el autonumérico
}

export interface IItemEntrega {
  clave: number; // Autonumérico
  marca?: string;
  modelo?: string;
  concepto: string; // Descripción o concepto del item
  cantidad: number;
  unidad: 'PZA' | 'MTS' | 'SERV' | 'LOTE';
}

const ItemEntregaSchema = new Schema<IItemEntrega>({
  clave: { 
    type: Number, 
    required: true
  },
  marca: { 
    type: String, 
    required: false
  },
  modelo: { 
    type: String, 
    required: false
  },
  concepto: { 
    type: String, 
    required: true,
    trim: true 
  },
  cantidad: { 
    type: Number, 
    required: true,
    min: 0 
  },
  unidad: { 
    type: String, 
    required: true,
    enum: ['PZA', 'MTS', 'SERV', 'LOTE']
  }
});

const EntregaSchema = new Schema<IEntrega>({
  numeroPresupuesto: { 
    type: String, 
    required: true,
    unique: true,
    trim: true 
  },
  cliente: { 
    type: String, 
    required: true,
    trim: true 
  },
  razonSocial: { 
    type: Schema.Types.ObjectId,
    ref: 'RazonSocial',
    required: false
  },
  proyecto: {
    type: Schema.Types.ObjectId,
    ref: 'Proyecto',
    required: false
  },
  fecha: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  items: [ItemEntregaSchema],
  comentarios: { 
    type: String,
    required: false
  },
  fechaCreacion: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  fechaActualizacion: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  ultimaClave: {
    type: Number,
    required: true,
    default: 0
  }
});

export default mongoose.model<IEntrega>('Entrega', EntregaSchema);
