import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { InventoryItem } from '../src/models/InventoryItem';
import { InventoryMovement } from '../src/models/InventoryMovement';

dotenv.config();

async function clearInternalInventory() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI as string);
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