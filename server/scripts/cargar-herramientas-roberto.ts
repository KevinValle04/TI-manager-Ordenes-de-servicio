import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

// Array de herramientas a cargar
const herramientas = [
    {
        nombre: "MARTILLO",
        marca: "",
        modelo: "",
        valor: 150,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "TALADRO MILWAKEE C/PILA Y CARGADOR",
        marca: "MILWAKEE",
        modelo: "J7F2023",
        valor: 4000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "RACH PARA DADOS",
        marca: "",
        modelo: "",
        valor: 800,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZA PONCHADORA",
        marca: "",
        modelo: "",
        valor: 400,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "POLLO",
        marca: "TEMPO",
        modelo: "",
        valor: 1000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "TESTER",
        marca: "NETWORK",
        modelo: "",
        valor: 1600,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "MULTIMETRO",
        marca: "FLUKE",
        modelo: "",
        valor: 1200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "DESARMADOR DE PALETA",
        marca: "",
        modelo: "",
        valor: 100,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "DESARMADOR DE ESTRELLA",
        marca: "",
        modelo: "",
        valor: 100,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "DESARMADOR DE DADO 7/16",
        marca: "",
        modelo: "",
        valor: 100,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZAS ELECTRICAS",
        marca: "",
        modelo: "",
        valor: 300,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZAS DE C0RTE NEGRAS",
        marca: "HUSKY",
        modelo: "",
        valor: 200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "LLAVE CRECIENTE 10 IN",
        marca: "",
        modelo: "",
        valor: 400,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "LLAVE STELSON 14\"",
        marca: "",
        modelo: "",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "TIJERAS PARA LAMINA",
        marca: "MILWAKEE",
        modelo: "",
        valor: 400,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "CINTA METRICA",
        marca: "STANLEY",
        modelo: "",
        valor: 200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "SERRUCHO PARA TABLAROCA",
        marca: "KLEIN TOOLS",
        modelo: "",
        valor: 200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "CONJUNTO DE LLAVES L",
        marca: "",
        modelo: "",
        valor: 300,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "ZOZO BATERIAS",
        marca: "MILWAKEE",
        modelo: "",
        valor: 2000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "DESARMADOR PARA ESCARIAR",
        marca: "KLEIN TOOLS",
        modelo: "",
        valor: 759,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "BATERIA EXTRA M12",
        marca: "MILWAKEE",
        modelo: "3INR19/65",
        valor: 1000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "DESARMADORES DIF USO",
        marca: "HUSKY",
        modelo: "",
        valor: 400,
        cantidad: 4,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZA DE CORTE DIAGONAL 7\"",
        marca: "HUSKY",
        modelo: "",
        valor: 300,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "NIVEL MAGNETICO",
        marca: "HUSKY",
        modelo: "",
        valor: 300,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "JAM FREE TROMPO",
        marca: "MILWAKEE",
        modelo: "",
        valor: 1000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZA DE CORTE DIAGONAL 7\"",
        marca: "MILWAKEE",
        modelo: "",
        valor: 299,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
];

async function cargarHerramientas() {
    try {
        // Conectar a la base de datos
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/timanager');
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