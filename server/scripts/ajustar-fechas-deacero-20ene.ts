import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
import { Actividad } from '../src/models/Actividad';
import { Proyecto } from '../src/models/Proyecto';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/timanager';

// Nueva fecha de inicio: 20 de enero de 2026 (ayer desde tu perspectiva)
const NUEVA_FECHA_INICIO = new Date('2026-01-20');
// Fecha de inicio original en la base de datos: 12 de enero de 2026
const FECHA_INICIO_ORIGINAL = new Date('2026-01-12');

async function ajustarFechasDeAcero() {
  try {
    console.log('Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado exitosamente!\n');

    // Buscar el proyecto "De Acero" o "DeAcero"
    const proyecto = await Proyecto.findOne({ nombre: { $regex: /(De Acero|DeAcero)/i } });
    
    if (!proyecto) {
      console.log('❌ No se encontró el proyecto "DeAcero"');
      return;
    }

    console.log(`📁 Proyecto encontrado: ${proyecto.nombre}`);
    console.log(`   ID: ${proyecto._id}\n`);

    // Obtener actividades del proyecto ordenadas por número
    const actividades = await Actividad.find({ proyecto: proyecto._id })
      .sort({ numeroActividad: 1 });
    
    if (actividades.length === 0) {
      console.log('   No tiene actividades');
      return;
    }

    console.log(`   Encontradas ${actividades.length} actividades\n`);

    // Calcular el desplazamiento entre fecha original y nueva fecha
    const diferenciaTiempo = NUEVA_FECHA_INICIO.getTime() - FECHA_INICIO_ORIGINAL.getTime();
    const diferenciaDias = Math.round(diferenciaTiempo / (1000 * 60 * 60 * 24));

    console.log(`📅 Ajuste de fechas:`);
    console.log(`   Fecha inicio original en DB: ${FECHA_INICIO_ORIGINAL.toLocaleDateString('es-MX')}`);
    console.log(`   Nueva fecha de inicio: ${NUEVA_FECHA_INICIO.toLocaleDateString('es-MX')}`);
    console.log(`   Desplazamiento: +${diferenciaDias} días\n`);

    console.log('='.repeat(120));
    console.log(
      `${'No.'.padEnd(8)}` +
      `${'Descripción'.padEnd(60)}` +
      `${'Inicio Anterior'.padEnd(18)}` +
      `${'Inicio Nuevo'.padEnd(18)}` +
      `${'Fin Nueva'.padEnd(16)}`
    );
    console.log('='.repeat(120));

    let actualizadas = 0;

    for (const actividad of actividades) {
      const fechaInicioAnterior = new Date(actividad.fechaInicio);
      const fechaFinalAnterior = new Date(actividad.fechaFinal);
      
      // Calcular nuevas fechas aplicando el desplazamiento
      const nuevaFechaInicio = new Date(fechaInicioAnterior.getTime() + diferenciaTiempo);
      const nuevaFechaFinal = new Date(fechaFinalAnterior.getTime() + diferenciaTiempo);

      // Actualizar en la base de datos
      await Actividad.findByIdAndUpdate(actividad._id, {
        fechaInicio: nuevaFechaInicio,
        fechaFinal: nuevaFechaFinal
      });

      // Formatear fechas para mostrar
      const formatDate = (d: Date) => d.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });

      const descripcionCorta = actividad.descripcion.length > 58 
        ? actividad.descripcion.substring(0, 58) + '...' 
        : actividad.descripcion;

      console.log(
        `${(actividad.numeroActividad || 'N/A').padEnd(8)}` +
        `${descripcionCorta.padEnd(60)}` +
        `${formatDate(fechaInicioAnterior).padEnd(18)}` +
        `${formatDate(nuevaFechaInicio).padEnd(18)}` +
        `${formatDate(nuevaFechaFinal).padEnd(16)}`
      );

      actualizadas++;
    }

    console.log('='.repeat(120));
    console.log(`\n✅ Proceso completado exitosamente!`);
    console.log(`   Total de actividades actualizadas: ${actualizadas}`);
    console.log(`   Días desplazados: +${diferenciaDias}`);
    console.log(`   El proyecto ahora inicia el: ${NUEVA_FECHA_INICIO.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar
ajustarFechasDeAcero();
