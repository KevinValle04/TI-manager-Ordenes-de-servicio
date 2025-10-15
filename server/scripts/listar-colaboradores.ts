import mongoose from 'mongoose';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

async function listarColaboradores() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager');
        console.log('Conectado a MongoDB');

        // Obtener todos los colaboradores activos
        const colaboradores = await Colaborador.find({ activo: true }).select('_id numeroEmpleado nombre puesto');
        
        console.log('\nLista de Colaboradores Activos:');
        console.log('===========================================');
        colaboradores.forEach(col => {
            console.log(`ID: ${col._id}`);
            console.log(`Número de Empleado: ${col.numeroEmpleado}`);
            console.log(`Nombre: ${col.nombre}`);
            console.log(`Puesto: ${col.puesto}`);
            console.log('-------------------------------------------');
        });

    } catch (error) {
        console.error('Error al obtener colaboradores:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Ejecutar el script
listarColaboradores();