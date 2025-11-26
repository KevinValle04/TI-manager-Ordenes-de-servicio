import mongoose, { Document, Schema } from 'mongoose';

export interface ICotizacion extends Document {
  numeroPresupuesto: string;
  cliente: string | any; // Puede ser ObjectId o string para compatibilidad
  razonSocial?: string; // Referencia al ID de la razón social (opcional)
  vendedor?: string; // Referencia al ID del vendedor (opcional)
  proyecto?: string; // Referencia al ID del proyecto (opcional)
  fecha: Date;
  vigencia: Date;
  subtotal: number;
  iva: number; // Porcentaje de IVA (8%)
  ivaImporte: number; // Monto del IVA
  total: number;
  estado: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada' | 'Vencida';
  moneda?: string; // Moneda de la cotización (MXN o USD)
  items: IItemCotizacion[];
  comentarios?: string;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  calcularTotales(): void;
  ultimaClave: number; // Para el autonumérico
}

export interface IItemCotizacion {
  clave: number; // Autonumérico
  marca?: string; // Opcional para canalizaciones
  modelo?: string; // Opcional para canalizaciones
  concepto: string; // Descripción o concepto del item
  cantidad: number;
  unidad: 'PZA' | 'MTS' | 'SERV' | 'LOTE';
  precioUnitario: number;
  importe: number;
  esCanalizacion?: boolean; // Para identificar si es una canalización
  canalizacionId?: string; // ID de la canalización si aplica
  aplicarIva: boolean; // Indica si se debe aplicar IVA a este item
}

const ItemCotizacionSchema = new Schema<IItemCotizacion>({
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
  },
  precioUnitario: { 
    type: Number, 
    required: true,
    min: 0 
  },
  importe: { 
    type: Number, 
    required: true,
    min: 0 
  },
  esCanalizacion: {
    type: Boolean,
    default: false
  },
  canalizacionId: {
    type: String,
    required: false
  },
  aplicarIva: {
    type: Boolean,
    required: true,
    default: false
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
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  razonSocial: { 
    type: Schema.Types.ObjectId,
    ref: 'RazonSocial',
    required: false
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
  iva: {
    type: Number,
    required: true,
    default: 8 // 8% por defecto
  },
  ivaImporte: {
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
  moneda: {
    type: String,
    enum: ['MXN', 'USD'],
    default: 'MXN'
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
  },
  ultimaClave: {
    type: Number,
    required: true,
    default: 0
  }
});

// Método para calcular totales
CotizacionSchema.methods.calcularTotales = function() {
  // Calcula el subtotal sumando los importes de los items
  this.subtotal = this.items.reduce((total: number, item: IItemCotizacion): number => total + item.importe, 0);
  
  // Calcula el importe del IVA
  this.ivaImporte = this.subtotal * (this.iva / 100);
  
  // Calcula el total sumando el subtotal y el IVA
  this.total = this.subtotal + this.ivaImporte;

  // Actualiza la fecha de actualización
  this.fechaActualizacion = new Date();
};

export default mongoose.model<ICotizacion>('Cotizacion', CotizacionSchema);