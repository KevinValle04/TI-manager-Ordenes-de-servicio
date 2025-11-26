import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import Cliente from '../src/models/Cliente';
import Cotizacion from '../src/models/Cotizacion';

dotenv.config();

const migrarClientesCotizaciones = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager');
    console.log('✓ Conectado a MongoDB');

    // Obtener todas las cotizaciones
    const cotizaciones = await Cotizacion.find({});
    console.log(`\nEncontradas ${cotizaciones.length} cotizaciones\n`);

    let migradas = 0;
    let noEncontradas = 0;
    let yaEranObjectId = 0;

    for (const cotizacion of cotizaciones) {
      const clienteField = cotizacion.cliente;
      
      // Si ya es un ObjectId válido, saltar
      if (mongoose.Types.ObjectId.isValid(clienteField) && clienteField.length === 24) {
        try {
          // Verificar si realmente existe como ObjectId
          const clienteDoc = await Cliente.findById(clienteField);
          if (clienteDoc) {
            yaEranObjectId++;
            console.log(`✓ Cotización ${cotizacion.numeroPresupuesto}: ya tiene ObjectId válido (${clienteDoc.nombreEmpresa})`);
            continue;
          }
        } catch (err) {
          // No es un ObjectId válido, intentar buscar por nombre
        }
      }

      // Buscar cliente por nombre
      const clienteEncontrado = await Cliente.findOne({ 
        nombreEmpresa: { $regex: new RegExp(`^${clienteField}$`, 'i') }
      });

      if (clienteEncontrado) {
        cotizacion.cliente = (clienteEncontrado._id as any).toString();
        await cotizacion.save();
        migradas++;
        console.log(`✓ Cotización ${cotizacion.numeroPresupuesto}: "${clienteField}" → ${clienteEncontrado._id} (${clienteEncontrado.nombreEmpresa})`);
      } else {
        noEncontradas++;
        console.log(`✗ Cotización ${cotizacion.numeroPresupuesto}: No se encontró cliente con nombre "${clienteField}"`);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Cotizaciones migradas: ${migradas}`);
    console.log(`Ya eran ObjectId: ${yaEranObjectId}`);
    console.log(`Clientes no encontrados: ${noEncontradas}`);
    console.log('===============\n');

    await mongoose.disconnect();
    console.log('✓ Desconectado de MongoDB');
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
};

migrarClientesCotizaciones();
