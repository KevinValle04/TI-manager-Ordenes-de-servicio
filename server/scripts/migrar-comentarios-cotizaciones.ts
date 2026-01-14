/**
 * Script de migración para convertir el campo 'comentarios' al nuevo formato
 * de campos separados: 'comentariosInternos' y 'comentariosPdf'
 * 
 * Los comentarios existentes se migrarán a 'comentariosInternos' para no perderlos.
 * 
 * Ejecutar con: npx ts-node scripts/migrar-comentarios-cotizaciones.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager';

async function migrarComentariosCotizaciones() {
  console.log('=== MIGRACIÓN DE COMENTARIOS DE COTIZACIONES ===\n');
  
  try {
    // Conectar a MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Conectado a MongoDB');
    
    // Acceder directamente a la colección para evitar validaciones del modelo
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No se pudo obtener la base de datos');
    }
    
    const cotizacionesCollection = db.collection('cotizacions');
    
    // 1. Buscar cotizaciones que tienen 'comentarios' pero no tienen 'comentariosInternos'
    const cotizacionesConComentarios = await cotizacionesCollection.find({
      $and: [
        { comentarios: { $exists: true } },
        { comentarios: { $nin: ['', null] } },
        { $or: [
          { comentariosInternos: { $exists: false } },
          { comentariosInternos: '' },
          { comentariosInternos: null }
        ]}
      ]
    }).toArray();
    
    console.log(`\n📊 Cotizaciones encontradas con comentarios antiguos: ${cotizacionesConComentarios.length}`);
    
    if (cotizacionesConComentarios.length === 0) {
      console.log('\n✓ No hay cotizaciones que necesiten migración.');
      console.log('  - Todas las cotizaciones ya tienen el formato nuevo o no tenían comentarios.');
    } else {
      console.log('\n🔄 Iniciando migración...\n');
      
      let migradas = 0;
      let errores = 0;
      
      for (const cotizacion of cotizacionesConComentarios) {
        try {
          const comentarioAntiguo = cotizacion.comentarios;
          
          // Actualizar: mover comentarios a comentariosInternos
          await cotizacionesCollection.updateOne(
            { _id: cotizacion._id },
            { 
              $set: { 
                comentariosInternos: comentarioAntiguo,
                fechaActualizacion: new Date()
              },
              $unset: { comentarios: '' } // Eliminar el campo antiguo
            }
          );
          
          migradas++;
          console.log(`  ✓ Migrada: ${cotizacion.numeroPresupuesto}`);
          console.log(`    Comentario: "${comentarioAntiguo?.substring(0, 50)}${comentarioAntiguo?.length > 50 ? '...' : ''}"`);
        } catch (err) {
          errores++;
          console.error(`  ✗ Error migrando ${cotizacion.numeroPresupuesto}:`, err);
        }
      }
      
      console.log('\n📊 Resumen de migración:');
      console.log(`  - Cotizaciones migradas exitosamente: ${migradas}`);
      console.log(`  - Errores: ${errores}`);
    }
    
    // 2. Verificar cotizaciones que ya tienen el formato nuevo
    const cotizacionesNuevoFormato = await cotizacionesCollection.countDocuments({
      $or: [
        { comentariosInternos: { $exists: true, $nin: ['', null] } },
        { comentariosPdf: { $exists: true, $nin: ['', null] } }
      ]
    });
    
    console.log(`\n📊 Cotizaciones con nuevo formato de comentarios: ${cotizacionesNuevoFormato}`);
    
    // 3. Estadísticas finales
    const totalCotizaciones = await cotizacionesCollection.countDocuments({});
    console.log(`📊 Total de cotizaciones en la base de datos: ${totalCotizaciones}`);
    
    console.log('\n=== MIGRACIÓN COMPLETADA ===\n');
    
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Desconectado de MongoDB');
  }
}

// Ejecutar el script
migrarComentariosCotizaciones();
