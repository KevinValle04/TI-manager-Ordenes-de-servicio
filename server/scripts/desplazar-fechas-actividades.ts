import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
import { Actividad } from '../src/models/Actividad';
import { Proyecto } from '../src/models/Proyecto';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/timanager';

// Nueva fecha de inicio base: 12 de enero de 2026
const NUEVA_FECHA_INICIO = new Date('2026-01-12');

async function desplazarFechasActividades() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Conectado exitosamente!\n');

    // Obtener todos los proyectos
    const proyectos = await Proyecto.find({});
    console.log(`Encontrados ${proyectos.length} proyectos\n`);

    let totalActividadesActualizadas = 0;

    for (const proyecto of proyectos) {
      console.log(`\n📁 Proyecto: ${proyecto.nombre}`);
      
      // Obtener actividades del proyecto ordenadas por fecha de inicio
      const actividades = await Actividad.find({ proyecto: proyecto._id })
        .sort({ fechaInicio: 1 });

      if (actividades.length === 0) {
        console.log('   No tiene actividades');
        continue;
      }

      console.log(`   Encontradas ${actividades.length} actividades`);

      // Encontrar la fecha de inicio más temprana del proyecto
      const fechaInicioOriginal = new Date(actividades[0].fechaInicio);
      
      // Calcular la diferencia en milisegundos
      const diferenciaTiempo = NUEVA_FECHA_INICIO.getTime() - fechaInicioOriginal.getTime();
      const diferenciaDias = Math.round(diferenciaTiempo / (1000 * 60 * 60 * 24));
      
      console.log(`   Fecha inicio original: ${fechaInicioOriginal.toISOString().split('T')[0]}`);
      console.log(`   Nueva fecha inicio: ${NUEVA_FECHA_INICIO.toISOString().split('T')[0]}`);
      console.log(`   Desplazamiento: ${diferenciaDias} días\n`);

      // Desplazar cada actividad
      for (const actividad of actividades) {
        const fechaInicioAnterior = new Date(actividad.fechaInicio);
        const fechaFinalAnterior = new Date(actividad.fechaFinal);
        
        // Calcular nuevas fechas
        const nuevaFechaInicio = new Date(fechaInicioAnterior.getTime() + diferenciaTiempo);
        const nuevaFechaFinal = new Date(fechaFinalAnterior.getTime() + diferenciaTiempo);

        // Actualizar en la base de datos
        await Actividad.findByIdAndUpdate(actividad._id, {
          fechaInicio: nuevaFechaInicio,
          fechaFinal: nuevaFechaFinal
        });

        const numeroAct = actividad.numeroActividad || 'ACT--';
        console.log(`   ✓ ${numeroAct}: ${fechaInicioAnterior.toISOString().split('T')[0]} → ${nuevaFechaInicio.toISOString().split('T')[0]} | ${fechaFinalAnterior.toISOString().split('T')[0]} → ${nuevaFechaFinal.toISOString().split('T')[0]}`);
        totalActividadesActualizadas++;
      }
    }

    console.log(`\n✅ Proceso completado!`);
    console.log(`   Total de actividades actualizadas: ${totalActividadesActualizadas}`);
    console.log(`   Todas las actividades ahora inician a partir del: ${NUEVA_FECHA_INICIO.toLocaleDateString('es-MX')}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar
desplazarFechasActividades();
