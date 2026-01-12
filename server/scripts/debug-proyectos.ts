import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Proyecto } from '../src/models/Proyecto';
import { Actividad } from '../src/models/Actividad';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/timanager';

async function debug() {
  try {
    console.log('Conectando a:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado!\n');
    
    // Buscar proyectos directamente
    console.log('\n--- Proyectos ---');
    const proyectos = await Proyecto.find({}).lean();
    console.log(`Total: ${proyectos.length}`);
    proyectos.forEach(p => console.log(`  - "${(p as any).nombre}" (ID: ${(p as any)._id})`));
    
    // Buscar actividades que contengan "ACT" en la descripción
    console.log('\n--- Actividades con "ACT" en descripción ---');
    const actividades = await Actividad.find({ descripcion: { $regex: /ACT\d{2}/i } })
      .populate('proyecto', 'nombre')
      .lean();
    console.log(`Total: ${actividades.length}`);
    actividades.slice(0, 5).forEach(a => {
      const act = a as any;
      console.log(`  - Proyecto: ${act.proyecto?.nombre || act.proyecto}`);
      console.log(`    Num: ${act.numeroActividad}`);
      console.log(`    Desc: ${act.descripcion?.substring(0, 60)}...`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

debug();
