const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager';

async function fixDocumentoIndex() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Conectado a MongoDB');
    
    const db = client.db();
    const collection = db.collection('documentos');
    
    // Contar documentos actuales
    const count = await collection.countDocuments();
    console.log(`📄 Total de documentos existentes: ${count}`);
    
    // SOLO eliminar el índice único de documentoId
    try {
      await collection.dropIndex('documentoId_1');
      console.log('✅ Índice único "documentoId_1" eliminado correctamente');
      console.log('ℹ️  Los documentos existentes NO fueron modificados');
    } catch (error) {
      if (error.code === 27) {
        console.log('ℹ️  El índice "documentoId_1" no existe (ya fue eliminado)');
      } else {
        console.error('❌ Error al eliminar índice:', error.message);
      }
    }
    
    // Mostrar índices actuales
    const indexes = await collection.indexes();
    console.log('\n📋 Índices actuales en la colección "documentos":');
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });
    
    console.log('\n✅ Proceso completado. Ahora puedes reiniciar el servidor.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('🔌 Conexión cerrada\n');
  }
}

fixDocumentoIndex();
