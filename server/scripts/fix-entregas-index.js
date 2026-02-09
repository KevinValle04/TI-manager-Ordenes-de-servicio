// Script para eliminar el índice incorrecto de numeroPresupuesto en la colección entregas
require('dotenv').config();
const mongoose = require('mongoose');

async function fixEntregasIndex() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Conectado exitosamente');

    const db = mongoose.connection.db;
    const collection = db.collection('entregas');

    console.log('\n=== Índices actuales en la colección entregas ===');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));

    // Buscar el índice problemático
    const problematicIndex = indexes.find(idx => idx.key && idx.key.numeroPresupuesto);
    
    if (problematicIndex) {
      console.log('\n⚠️  Se encontró el índice problemático:', problematicIndex.name);
      console.log('Eliminando índice...');
      
      await collection.dropIndex(problematicIndex.name);
      console.log('✅ Índice eliminado exitosamente');
    } else {
      console.log('\n✅ No se encontró el índice problemático. La colección está correcta.');
    }

    console.log('\n=== Índices después de la corrección ===');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    console.log('\n✅ Proceso completado exitosamente');
    
  } catch (error) {
    console.error('❌ Error al ejecutar el script:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Conexión cerrada');
    process.exit(0);
  }
}

fixEntregasIndex();
