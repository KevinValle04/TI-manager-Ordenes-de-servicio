import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Importar modelos
import { Actividad } from '../src/models/Actividad';
import { Proyecto } from '../src/models/Proyecto';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/timanager';

// Días a desplazar
const DIAS_DESPLAZAR = 8;

async function desplazarActividadesDeAcero() {
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
    console.log(`📅 Desplazando actividades ${DIAS_DESPLAZAR} días hacia adelante...\n`);

    // Obtener actividades del proyecto ordenadas por número
    const actividades = await Actividad.find({ proyecto: proyecto._id })
      .sort({ numeroActividad: 1 });
    
    if (actividades.length === 0) {
      console.log('   No tiene actividades');
      return;
    }

    console.log(`   Encontradas ${actividades.length} actividades\n`);
    console.log('='.repeat(100));
    console.log(`${'No.'.padEnd(8)}${'Descripción'.padEnd(55)}${'Inicio Anterior'.padEnd(18)}${'Inicio Nuevo'.padEnd(18)}`);
    console.log('='.repeat(100));

    for (const actividad of actividades) {
      const fechaInicioAnterior = new Date(actividad.fechaInicio);
      const fechaFinalAnterior = new Date(actividad.fechaFinal);
      
      // Agregar 8 días
      const fechaInicioNueva = new Date(fechaInicioAnterior);
      fechaInicioNueva.setDate(fechaInicioNueva.getDate() + DIAS_DESPLAZAR);
      
      const fechaFinalNueva = new Date(fechaFinalAnterior);
      fechaFinalNueva.setDate(fechaFinalNueva.getDate() + DIAS_DESPLAZAR);

      // Formatear fechas para mostrar
      const formatDate = (d: Date) => d.toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });

      // Actualizar la actividad
      await Actividad.findByIdAndUpdate(actividad._id, {
        fechaInicio: fechaInicioNueva,
        fechaFinal: fechaFinalNueva
      });

      const descripcionCorta = actividad.descripcion.length > 50 
        ? actividad.descripcion.substring(0, 50) + '...' 
        : actividad.descripcion;

      console.log(
        `${(actividad.numeroActividad || 'N/A').padEnd(8)}` +
        `${descripcionCorta.padEnd(55)}` +
        `${formatDate(fechaInicioAnterior).padEnd(18)}` +
        `${formatDate(fechaInicioNueva).padEnd(18)}`
      );
    }

    console.log('='.repeat(100));
    console.log(`\n✅ Proceso completado!`);
    console.log(`   Total de actividades desplazadas: ${actividades.length}`);
    console.log(`   Días desplazados: +${DIAS_DESPLAZAR}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDesconectado de MongoDB');
  }
}

// Ejecutar
desplazarActividadesDeAcero();
