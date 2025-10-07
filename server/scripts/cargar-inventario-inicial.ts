import dotenv from 'dotenv';
import * as fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { InventoryItem } from '../src/models/InventoryItem';
import { InventoryMovement } from '../src/models/InventoryMovement';

// Cargar el .env desde la carpeta server
dotenv.config({ path: path.join(__dirname, '../.env') });

// Asegurarse de que la variable de entorno MONGO_URI esté definida
if (!process.env.MONGO_URI) {
    console.error('La variable de entorno MONGO_URI no está definida en el archivo .env');
    process.exit(1);
}

async function cargarInventarioInicial() {
    try {
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Conectado a MongoDB');

        // Leer el archivo JSON
        const jsonPath = path.join(__dirname, 'nuevos_ingresos.json');
        
        // Verificar si el archivo existe
        if (!fs.existsSync(jsonPath)) {
            console.error(`❌ No se encontró el archivo: ${jsonPath}`);
            console.log('📁 Asegúrate de que el archivo nuevos_ingresos.json esté en: server/scripts/');
            return;
        }

        const jsonData = fs.readFileSync(jsonPath, 'utf-8');
        const inventarioInicial: Array<{ marca?: string; modelo?: string; descripcion?: string; cantidad?: number; [key: string]: any }> = JSON.parse(jsonData);

        // Filtrar objetos vacíos (solo con __v: null)
        const inventarioLimpio = inventarioInicial.filter((item) => 
            item.marca && item.modelo && item.descripcion
        );

        console.log(`Se encontraron ${inventarioLimpio.length} artículos válidos en el JSON`);

        // Limpiar la colección antes de insertar para evitar duplicados
        await InventoryItem.deleteMany({});
        await InventoryMovement.deleteMany({ comentario: "Carga inicial de inventario" });
        console.log('Colecciones limpiadas.');

        // Insertar todos los artículos
        const resultado = await InventoryItem.insertMany(inventarioLimpio);
        console.log(`Se insertaron ${resultado.length} artículos correctamente`);

        // También crear los movimientos de entrada inicial
        const movimientos = resultado.map(item => ({
            itemId: item._id,
            tipo: "entrada",
            cantidad: item.cantidad,
            fecha: new Date(),
            comentario: "Carga inicial de inventario",
            usuario: "SISTEMA"
        }));
        
        if (movimientos.length > 0) {
            await InventoryMovement.insertMany(movimientos);
            console.log(`Se crearon ${movimientos.length} movimientos de inventario inicial.`);
        }

        console.log('Proceso completado exitosamente');
    } catch (error) {
        console.error('Error al cargar el inventario:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Desconectado de MongoDB');
    }
}

cargarInventarioInicial();