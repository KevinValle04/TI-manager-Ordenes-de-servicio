import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Colaborador from '../src/models/Colaborador';
import Counter from '../src/models/Counter';

dotenv.config();

async function resetEmployeeCounter() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || "");
        console.log('Conectado a MongoDB');

        // Obtener el número más alto actual de empleado
        const maxEmployee = await Colaborador.findOne().sort({ numeroEmpleado: -1 });
        const startValue = maxEmployee ? maxEmployee.numeroEmpleado : 45;
        
        // Actualizar el contador al valor más alto actual
        await Counter.findOneAndUpdate(
            { _id: 'empleadoId' },
            { sequence_value: startValue },
            { upsert: true }
        );
        console.log(`Contador actualizado al último número utilizado: ${startValue}`);

        // Obtener todos los colaboradores ordenados por fecha de creación
        const colaboradores = await Colaborador.find().sort({ createdAt: 1 });
        console.log(`Encontrados ${colaboradores.length} colaboradores para actualizar`);

        // Actualizar cada colaborador con un nuevo número secuencial
        for (let i = 0; i < colaboradores.length; i++) {
            const newId = i + 46; // Empezamos desde 46
            const oldId = colaboradores[i].numeroEmpleado;
            
            await Colaborador.findByIdAndUpdate(
                colaboradores[i]._id,
                { numeroEmpleado: newId }
            );
            
            console.log(`Actualizado colaborador: ${oldId} -> ${newId}`);
        }

        console.log('Actualización completada');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

resetEmployeeCounter();