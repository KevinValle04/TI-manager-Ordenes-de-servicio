import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import dotenv from 'dotenv';

dotenv.config();

const limpiarHerramientasTest = async () => {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager');
    console.log('Conectado a MongoDB');

    // Eliminar todas las herramientas que contienen la palabra TEST
    const resultado = await Herramienta.deleteMany({
      nombre: { $regex: /TEST/i }  // Busca "TEST" sin importar mayúsculas/minúsculas
    });

    console.log(`Se eliminaron ${resultado.deletedCount} herramientas de prueba`);

    // Cerrar la conexión
    await mongoose.connection.close();
    console.log('Conexión cerrada');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

limpiarHerramientasTest();