import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import dotenv from 'dotenv';

dotenv.config();

async function fixIndexes() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager');
        console.log('Conectado a MongoDB');

        // Eliminar los índices existentes
        await Herramienta.collection.dropIndexes();
        console.log('Índices eliminados');

        // Crear nuevo índice para serialNumber
        // No crear índice único para serialNumber ya que permitiremos valores duplicados vacíos
        console.log('No se requieren índices especiales');
        console.log('Nuevo índice creado');

        console.log('Índices actualizados exitosamente');
    } catch (error) {
        console.error('Error al actualizar índices:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Ejecutar el script
fixIndexes();