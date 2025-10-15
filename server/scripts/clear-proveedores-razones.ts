import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import Proveedor from '../src/models/Proveedor';
import RazonSocial from '../src/models/RazonSocial';

// Cargar variables de entorno desde el directorio padre (server)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Función principal
async function clearProveedoresYRazones() {
    try {
        // Verificar que la URI de MongoDB esté configurada
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI no está configurada en las variables de entorno');
        }
        
        console.log('Conectando a MongoDB:', mongoUri);
        
        // Conectar a MongoDB
        await mongoose.connect(mongoUri);
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