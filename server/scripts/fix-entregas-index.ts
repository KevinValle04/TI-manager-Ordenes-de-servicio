import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager';

async function fixEntregasIndex() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No se pudo obtener la base de datos');
    }
    
    const collection = db.collection('entregas');

    // Listar índices actuales
    console.log('\n===== ÍNDICES ACTUALES =====');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Eliminar el índice problemático numeroPresupuesto_1
    try {
      console.log('\n===== ELIMINANDO ÍNDICE numeroPresupuesto_1 =====');
      await collection.dropIndex('numeroPresupuesto_1');
      console.log('✅ Índice numeroPresupuesto_1 eliminado exitosamente');
    } catch (err: any) {
      if (err.code === 27) {
        console.log('⚠️ El índice numeroPresupuesto_1 no existe (ya fue eliminado)');
      } else {
        throw err;
      }
    }

    // Listar índices después de la eliminación
    console.log('\n===== ÍNDICES DESPUÉS DE LA CORRECCIÓN =====');
    const indexesAfter = await collection.indexes();
    console.log(JSON.stringify(indexesAfter, null, 2));

    console.log('\n✅ Corrección completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
    process.exit(0);
  }
}

fixEntregasIndex();
