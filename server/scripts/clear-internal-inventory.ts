import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { InventoryItem } from '../src/models/InventoryItem';
import { InventoryMovement } from '../src/models/InventoryMovement';

// Cargar el .env desde la carpeta server
dotenv.config({ path: path.join(__dirname, '../.env') });
async function clearInternalInventory() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Conectado a MongoDB');

        // Eliminar todos los movimientos de inventario
        const deleteMovementsResult = await InventoryMovement.deleteMany({});
        console.log(`Eliminados ${deleteMovementsResult.deletedCount} movimientos de inventario`);

        // Eliminar todos los items del inventario
        const deleteItemsResult = await InventoryItem.deleteMany({});
        console.log(`Eliminados ${deleteItemsResult.deletedCount} items del inventario`);

        console.log('Proceso completado exitosamente');
    } catch (error) {
        console.error('Error al limpiar el inventario:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado de MongoDB');
    }
}

// Ejecutar el script
clearInternalInventory();