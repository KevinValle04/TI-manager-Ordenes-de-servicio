import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

// Array de herramientas a cargar
const herramientas = [
    {
        nombre: "DESARMADORES DE CRUZ",
        marca: "HUSKY",
        modelo: "USADO",
        valor: 0,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "DESAMADOR DE PALETA",
        marca: "HUSKY",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZA ELECTRICA ROJA",
        marca: "MILWAKEE",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZA DE CORTE VERDE",
        marca: "",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZA PELADORA",
        marca: "COMERCIAL ELECTRIC",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PONCHADORA COLOR VERDE",
        marca: "COMERCIAL ELECTRIC",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PINZAS PERRAS",
        marca: "TRUPER",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "KIT DE PUNTAS DE DADO PARA TALADRO",
        marca: "RYOBI",
        modelo: "USADO",
        valor: 0,
        cantidad: 6,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "BROCA PARA CONCRETO DE ½",
        marca: "",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "TROMPO PARA CORTE",
        marca: "HERCULES",
        modelo: "NUEVO",
        valor: 0,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "BOLSA CON DESARMADORES DE ESTRELLA Y PALETA",
        marca: "EPCOM",
        modelo: "NUEVO",
        valor: 0,
        cantidad: 6,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "BOLSA CON DESARMADORES",
        marca: "MILWAKEE",
        modelo: "USADO",
        valor: 0,
        cantidad: 5,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "PISTOLA PARA SILICON",
        marca: "TRUPER",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "SEGUETA",
        marca: "",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "CAJA DE ACCESORIOS PARA TALADRO (IMCOMPLETO)",
        marca: "MAKITA",
        modelo: "USADO",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "KIT DE PROBADOR SCOUT",
        marca: "KLEIN TOOLS",
        modelo: "VDV501-851",
        valor: 2582.41,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "ROTOMARTILLO CON CARGADOR",
        marca: "MAKITA",
        modelo: "",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe295b2d3e3a020a36cb2",
    },
    {
        nombre: "SET DE BROCAS",
        marca: "MAKITA",
        modelo: "",
        valor: 0,
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