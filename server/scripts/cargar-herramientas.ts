import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

// Array de herramientas a cargar
const herramientas = [
    {
        nombre: "EJEMPLO - Taladro", // Nombre de la herramienta
        marca: "DeWalt",            // Marca de la herramienta
        modelo: "DCD777C2",        // Modelo de la herramienta
        valor: 2500,               // Valor en pesos mexicanos
        cantidad: 1,               // Cantidad de unidades
        serialNumber: "ABC123",    // Número de serie (opcional)
        colaboradorId: "ID_DEL_COLABORADOR", // Este ID lo debes reemplazar con el ID real del colaborador
    },
    // Puedes copiar y pegar este objeto tantas veces como herramientas necesites agregar
    // No olvides cambiar el colaboradorId por el ID real del colaborador al que se asignará
];

async function cargarHerramientas() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timanager');
        console.log('Conectado a MongoDB');

        // Validar que los colaboradores existan antes de cargar las herramientas
        for (const herramienta of herramientas) {
            const colaborador = await Colaborador.findById(herramienta.colaboradorId);
            if (!colaborador) {
                throw new Error(`Colaborador con ID ${herramienta.colaboradorId} no encontrado`);
            }
        }

        // Cargar las herramientas
        for (const herramienta of herramientas) {
            await Herramienta.create({
                ...herramienta,
                fechaAsignacion: new Date(),
                activo: true
            });
            console.log(`Herramienta "${herramienta.nombre}" cargada exitosamente`);
        }

        console.log('Todas las herramientas han sido cargadas exitosamente');
    } catch (error) {
        console.error('Error al cargar las herramientas:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Ejecutar el script
cargarHerramientas();