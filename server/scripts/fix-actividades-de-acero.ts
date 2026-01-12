import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
import { Actividad } from '../src/models/Actividad';
import { Proyecto } from '../src/models/Proyecto';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/timanager';

async function fixActividadesDeAcero() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado exitosamente!\n');

    // Buscar el proyecto "De Acero"
    const proyecto = await Proyecto.findOne({ nombre: { $regex: /De Acero/i } });
    
    if (!proyecto) {
      console.log('❌ No se encontró el proyecto "De Acero"');
      return;
    }

    console.log(`📁 Proyecto encontrado: ${proyecto.nombre}`);
    console.log(`   ID: ${proyecto._id}\n`);

    // Obtener actividades del proyecto
    const actividades = await Actividad.find({ proyecto: proyecto._id });
    
    if (actividades.length === 0) {
      console.log('   No tiene actividades');
      return;
    }

    console.log(`   Encontradas ${actividades.length} actividades\n`);
    console.log('Procesando actividades...\n');

    let totalActualizadas = 0;

    for (const actividad of actividades) {
      const descripcionOriginal = actividad.descripcion;
      
      // Regex para extraer el número ACT de la descripción
      // Busca el patrón "ACT## – " o "ACT## - " dentro de la descripción
      const match = descripcionOriginal.match(/ACT(\d{2})\s*[–-]\s*/);
      
      if (match) {
        const numeroExtraido = `ACT${match[1]}`;
        // Nueva descripción sin el prefijo ACT## – 
        const nuevaDescripcion = descripcionOriginal.replace(/ACT\d{2}\s*[–-]\s*/, '');
        
        console.log(`\n📝 Actividad actual:`);
        console.log(`   Número actual: ${actividad.numeroActividad}`);
        console.log(`   Descripción actual: ${descripcionOriginal.substring(0, 60)}...`);
        console.log(`   → Nuevo número: ${numeroExtraido}`);
        console.log(`   → Nueva descripción: ${nuevaDescripcion.substring(0, 60)}...`);

        // Actualizar la actividad
        await Actividad.findByIdAndUpdate(actividad._id, {
          numeroActividad: numeroExtraido,
          descripcion: nuevaDescripcion
        });

        console.log(`   ✅ Actualizado correctamente`);
        totalActualizadas++;
      } else {
        console.log(`\n⚠️ No se pudo extraer número de: ${descripcionOriginal.substring(0, 50)}...`);
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ Proceso completado!`);
    console.log(`   Total de actividades actualizadas: ${totalActualizadas}/${actividades.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar
fixActividadesDeAcero();
