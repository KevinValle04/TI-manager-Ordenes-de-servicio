import mongoose, { Document, Schema, Types } from "mongoose";

export interface IInventoryItem extends Document {
  marca: string;
  modelo: string;
  descripcion: string;
  proveedor: string;
  unidad: string;
  precioUnitario: number;
  cantidad: number;
  numerosSerie: string[]; // Puede ser una lista vacía si no aplica
  categorias: string[];
  razonSocial?: Types.ObjectId; // Referencia opcional a RazonSocial
}

const InventoryItemSchema: Schema = new Schema({
  marca: { type: String },
  modelo: { type: String },
  descripcion: { type: String },
  proveedor: { type: String },
  unidad: { type: String },
  precioUnitario: { type: Number },
  cantidad: { type: Number },
  numerosSerie: { type: [String], default: [] }, // Arreglo de números de serie
  categorias: { type: [String], default: [] },
  razonSocial: { type: Schema.Types.ObjectId, ref: 'RazonSocial', required: false },
});

export const InventoryItem = mongoose.model<IInventoryItem>(
  "InventoryItem",
  InventoryItemSchema
);
