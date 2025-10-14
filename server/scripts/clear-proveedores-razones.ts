import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Proveedor from '../src/models/Proveedor';
import RazonSocial from '../src/models/RazonSocial';

// Cargar variables de entorno
dotenv.config();

// Función principal
async function clearProveedoresYRazones() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Conectado a MongoDB');

        // Eliminar todos los proveedores
        const resultProveedores = await Proveedor.deleteMany({});
        console.log(`Proveedores eliminados: ${resultProveedores.deletedCount}`);

        // Eliminar todas las razones sociales
        const resultRazones = await RazonSocial.deleteMany({});
        console.log(`Razones sociales eliminadas: ${resultRazones.deletedCount}`);

        console.log('Proceso completado exitosamente');
    } catch (error) {
        console.error('Error durante el proceso:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada');
    }
}

// Ejecutar la función
clearProveedoresYRazones();