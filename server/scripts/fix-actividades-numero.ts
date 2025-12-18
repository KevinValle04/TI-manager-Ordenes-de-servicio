import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
import { Actividad } from '../src/models/Actividad';
import { Proyecto } from '../src/models/Proyecto';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventario';

async function fixActividadesNumero() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado exitosamente!\n');

    // Obtener todos los proyectos
    const proyectos = await Proyecto.find({});
    console.log(`Encontrados ${proyectos.length} proyectos\n`);

    let totalActividadesActualizadas = 0;

    for (const proyecto of proyectos) {
      console.log(`\n📁 Proyecto: ${proyecto.nombre}`);
      
      // Obtener actividades del proyecto ordenadas por fecha de creación
      const actividades = await Actividad.find({ proyecto: proyecto._id })
        .sort({ createdAt: 1 });

      if (actividades.length === 0) {
        console.log('   No tiene actividades');
        continue;
      }

      console.log(`   Encontradas ${actividades.length} actividades`);

      // Asignar números secuenciales
      for (let i = 0; i < actividades.length; i++) {
        const actividad = actividades[i];
        const nuevoNumero = `ACT${i.toString().padStart(2, '0')}`;
        
        // Solo actualizar si no tiene número o es diferente
        if (!actividad.numeroActividad || actividad.numeroActividad !== nuevoNumero) {
          await Actividad.findByIdAndUpdate(actividad._id, {
            numeroActividad: nuevoNumero
          });
          console.log(`   ✓ ${actividad.descripcion.substring(0, 40)}... → ${nuevoNumero}`);
          totalActividadesActualizadas++;
        } else {
          console.log(`   - ${actividad.descripcion.substring(0, 40)}... ya tiene ${nuevoNumero}`);
        }
      }
    }

    console.log(`\n✅ Proceso completado!`);
    console.log(`   Total de actividades actualizadas: ${totalActividadesActualizadas}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar
fixActividadesNumero();
