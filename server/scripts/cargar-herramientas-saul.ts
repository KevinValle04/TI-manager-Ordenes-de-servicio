import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

// Array de herramientas a cargar
const herramientas = [
    {
        nombre: "LAPTOP",
        marca: "DELL",
        modelo: "",
        valor: 4500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "CARGADOR ,TALADRO Y BATERIA",
        marca: "DEWALL",
        modelo: "",
        valor: 4000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "MULTIMETRO",
        marca: "KLEIN TOOLS",
        modelo: "",
        valor: 2000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "TONO",
        marca: "KLEIN TOOLS",
        modelo: "",
        valor: 1500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "TESTER",
        marca: "TEMPO",
        modelo: "",
        valor: 2500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "PISTOLA PARA SILICON CALIENTE",
        marca: "TRUPER",
        modelo: "",
        valor: 200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "DESARMADORES VARIOS",
        marca: "MIXTAS",
        modelo: "",
        valor: 500,
        cantidad: 4,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "SWITCH",
        marca: "TPLINK",
        modelo: "",
        valor: 400,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "PINZAS VARIADAS",
        marca: "MIXTAS",
        modelo: "",
        valor: 450,
        cantidad: 4,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "REMATADORA",
        marca: "FLUKE",
        modelo: "",
        valor: 400,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "NAVAJA",
        marca: "",
        modelo: "",
        valor: 300,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
    },
    {
        nombre: "SET DE DESTORNILLADORES DE PRECISIÓN",
        marca: "RYOBI",
        modelo: "",
        valor: 139,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe2efb2d3e3a020a36cc6",
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