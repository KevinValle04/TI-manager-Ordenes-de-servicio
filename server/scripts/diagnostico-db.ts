import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario';

async function diagnostico() {
  try {
    console.log('URI de MongoDB:', MONGODB_URI);
    console.log('Conectando...');
    
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado!\n');

    const db = mongoose.connection.db;
    if (!db) {
      console.log('Error: No se pudo obtener la instancia de la base de datos');
      return;
    }

    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('Colecciones en la base de datos:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documentos`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

diagnostico();
