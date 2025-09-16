import mongoose, { Schema, Document } from 'mongoose';

interface ICounter extends Document {
  _id: string;
  sequence_value: number;
}

const CounterSchema = new Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 45 } // Iniciamos en 45 para que el primer ID sea 46
});

export default mongoose.model<ICounter>('Counter', CounterSchema);
