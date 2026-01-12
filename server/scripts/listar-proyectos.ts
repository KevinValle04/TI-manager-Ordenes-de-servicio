import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Proyecto } from '../src/models/Proyecto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario';

async function listarProyectos() {
  try {
    await mongoose.connect(MONGODB_URI);
    const proyectos = await Proyecto.find({}, 'nombre');
    console.log('Proyectos disponibles:');
    proyectos.forEach(p => console.log(`  - "${p.nombre}"`));
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

listarProyectos();
