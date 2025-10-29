import mongoose, { Schema, Document } from 'mongoose';

export interface ICotizacion extends Document {
  numeroPresupuesto: string;
  cliente: string;
  razonSocial?: string; // Referencia al ID de la razón social (opcional)
  fecha: Date;
  vigencia: Date;
  subtotal: number;
  utilidad: number; // Porcentaje de utilidad
  total: number;
  estado: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Vencida';
  items: IItemCotizacion[];
  comentarios?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  calcularTotales(): void;
}

export interface IItemCotizacion {
  material?: string; // Referencia al ID del material (opcional)
  descripcion: string;
  cantidad: number;
  unidad: 'PZA' | 'MTS';
  precioUnitario: number;
  subtotal: number;
}

const ItemCotizacionSchema = new Schema<IItemCotizacion>({
  material: { 
    type: String, 
    required: false // Opcional
  },
  descripcion: { 
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
    enum: ['PZA', 'MTS']
  },
  precioUnitario: { 
    type: Number, 
    required: true,
    min: 0 
  },
  subtotal: { 
    type: Number, 
    required: true,
    min: 0 
  }
});

const CotizacionSchema = new Schema<ICotizacion>({
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
  fecha: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  vigencia: { 
    type: Date, 
    required: true 
  },
  subtotal: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0 
  },
  utilidad: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0 
  },
  total: { 
    type: Number, 
    required: true,
    min: 0,
    default: 0 
  },
  estado: { 
    type: String, 
    required: true,
    enum: ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida'],
    default: 'Borrador'
  },
  items: [ItemCotizacionSchema],
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
  }
});

// Método para calcular totales
CotizacionSchema.methods.calcularTotales = function() {
  this.subtotal = this.items.reduce((total, item) => total + item.subtotal, 0);
  this.total = this.subtotal * (1 + this.utilidad / 100);
};

export default mongoose.model<ICotizacion>('Cotizacion', CotizacionSchema);