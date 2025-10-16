import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import { herramientas } from './cargar-herramientas';
import dotenv from 'dotenv';

dotenv.config();

async function recargarHerramientas() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager');
        console.log('Conectado a MongoDB');

        // Obtener el ID del colaborador del primer elemento (asumimos que todas las herramientas son del mismo colaborador)
        const colaboradorId = herramientas[0].colaboradorId;

        // Primero, eliminar todas las herramientas existentes para este colaborador
        const resultadoEliminacion = await Herramienta.deleteMany({ colaboradorId });
        console.log(`Se eliminaron ${resultadoEliminacion.deletedCount} herramientas existentes`);

        // Validar que el colaborador exista
        const colaborador = await Colaborador.findById(colaboradorId);
        if (!colaborador) {
            throw new Error(`Colaborador con ID ${colaboradorId} no encontrado`);
        }

        // Cargar las herramientas nuevamente
        for (const herramienta of herramientas) {
            await Herramienta.create({
                ...herramienta,
                fechaAsignacion: new Date(),
                activo: true
            });
            console.log(`Herramienta "${herramienta.nombre}" cargada exitosamente`);
        }

        console.log('Todas las herramientas han sido recargadas exitosamente');
    } catch (error) {
        console.error('Error al recargar las herramientas:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Conexión cerrada');
    }
}

// Ejecutar el script
recargarHerramientas();