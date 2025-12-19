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
// Fecha de inicio original (04 de enero de 2026)
const FECHA_INICIO_ORIGINAL = new Date('2026-01-04');

async function desplazarFechasDeacero() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Conectado exitosamente!\n');

    // Buscar el proyecto DEACERO
    const proyecto = await Proyecto.findOne({ nombre: /DEACERO/i });
    
    if (!proyecto) {
      console.log('❌ No se encontró el proyecto DEACERO');
      return;
    }

    console.log(`📁 Proyecto encontrado: ${proyecto.nombre}`);
    
    // Obtener actividades del proyecto
    const actividades = await Actividad.find({ proyecto: proyecto._id })
      .sort({ fechaInicio: 1 });

    if (actividades.length === 0) {
      console.log('   No tiene actividades');
      return;
    }

    console.log(`   Encontradas ${actividades.length} actividades\n`);

    // Calcular desplazamiento: del 04 de enero al 12 de enero = 8 días
    const diferenciaTiempo = NUEVA_FECHA_INICIO.getTime() - FECHA_INICIO_ORIGINAL.getTime();
    const diferenciaDias = Math.round(diferenciaTiempo / (1000 * 60 * 60 * 24));
    
    console.log(`   Fecha inicio original: ${FECHA_INICIO_ORIGINAL.toISOString().split('T')[0]}`);
    console.log(`   Nueva fecha inicio: ${NUEVA_FECHA_INICIO.toISOString().split('T')[0]}`);
    console.log(`   Desplazamiento: ${diferenciaDias} días\n`);

    let actualizadas = 0;

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
      const descripcionCorta = actividad.descripcion.substring(0, 50);
      console.log(`   ✓ ${numeroAct}: ${fechaInicioAnterior.toISOString().split('T')[0]} → ${nuevaFechaInicio.toISOString().split('T')[0]} | ${fechaFinalAnterior.toISOString().split('T')[0]} → ${nuevaFechaFinal.toISOString().split('T')[0]}`);
      console.log(`          ${descripcionCorta}...`);
      actualizadas++;
    }

    console.log(`\n✅ Proceso completado!`);
    console.log(`   Actividades actualizadas: ${actualizadas}`);
    console.log(`   Todas las actividades de DEACERO ahora inician a partir del: 12 de enero de 2026`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar
desplazarFechasDeacero();
