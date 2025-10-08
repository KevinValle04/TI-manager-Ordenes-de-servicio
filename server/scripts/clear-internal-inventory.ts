import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import * as readline from 'readline';
import { InventoryItem } from '../src/models/InventoryItem';
import { InventoryMovement } from '../src/models/InventoryMovement';

// Cargar el .env desde la carpeta server
dotenv.config({ path: path.join(__dirname, '../.env') });

// Asegurarse de que la variable de entorno MONGO_URI esté definida
if (!process.env.MONGO_URI) {
    console.error('La variable de entorno MONGO_URI no está definida en el archivo .env');
    process.exit(1);
}

// Función para pedir confirmación al usuario
function preguntarConfirmacion(): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('⚠️  ¿Estás seguro de que deseas ELIMINAR TODO el inventario? (escribe "SI" para confirmar): ', (respuesta) => {
            rl.close();
            resolve(respuesta.toUpperCase() === 'SI');
        });
    });
}

async function limpiarInventario() {
    try {
        // Pedir confirmación antes de proceder
        const confirmado = await preguntarConfirmacion();
        
        if (!confirmado) {
            console.log('❌ Operación cancelada por el usuario.');
            return;
        }

        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('✅ Conectado a MongoDB');

        // Contar registros antes de eliminar
        const countMovements = await InventoryMovement.countDocuments();
        const countItems = await InventoryItem.countDocuments();
        
        console.log(`\n📊 Registros encontrados:`);
        console.log(`   - Movimientos: ${countMovements}`);
        console.log(`   - Items: ${countItems}`);
        console.log('\n🗑️  Iniciando limpieza...\n');

        // Eliminar todos los movimientos de inventario
        const deleteMovementsResult = await InventoryMovement.deleteMany({});
        console.log(`✅ Eliminados ${deleteMovementsResult.deletedCount} movimientos de inventario`);

        // Eliminar todos los items del inventario
        const deleteItemsResult = await InventoryItem.deleteMany({});
        console.log(`✅ Eliminados ${deleteItemsResult.deletedCount} items del inventario`);

        console.log('\n✨ Proceso completado exitosamente - Inventario limpio');
    } catch (error) {
        console.error('❌ Error al limpiar el inventario:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Desconectado de MongoDB');
    }
}

// Ejecutar el script
limpiarInventario();