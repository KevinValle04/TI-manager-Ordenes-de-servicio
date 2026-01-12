import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

// Array de herramientas a cargar
const herramientas = [
    {
        nombre: "TALADRO",
        marca: "DEWALT",
        modelo: "DSC7781",
        valor: 1200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "2 BATERIAS DEWALT 20W",
        marca: "",
        modelo: "DCB200-B3",
        valor: 1100,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "CARGADOR DEWALT",
        marca: "",
        modelo: "DCB107",
        valor: 500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "PONCHADORA",
        marca: "EPCOM",
        modelo: "",
        valor: 450,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "PINZAS DE CORTE",
        marca: "HUSKY",
        modelo: "",
        valor: 300,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "PINZAS CORTACABLE",
        marca: "CORTACABLE",
        modelo: "",
        valor: 590,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "REMATADORA",
        marca: "FLUKE",
        modelo: "0914",
        valor: 1500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "KIT DE DADOS",
        marca: "RIOBY",
        modelo: "",
        valor: 650,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "GENERADOR DE TONOS",
        marca: "TEMPO",
        modelo: "",
        valor: 1800,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "PINZAS DE PRESION",
        marca: "",
        modelo: "",
        valor: 320,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "DESARMADOR PALETA 7/16",
        marca: "HUSKY",
        modelo: "",
        valor: 96,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "TALADRO ATORNILLADOR",
        marca: "MAKITA",
        modelo: "",
        valor: 3200,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "NIVEL",
        marca: "TRUPER",
        modelo: "",
        valor: 150,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "MULTIMETRO",
        marca: "KLEIN TOOLS",
        modelo: "MM308",
        valor: 890,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "DESARMADORES CHICOS PALETA 1/8",
        marca: "MILWAKKE",
        modelo: "",
        valor: 110,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "BROCA DE ¼",
        marca: "MILWAKEE",
        modelo: "48-89-2313",
        valor: 119,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "BROCA DE 3/8",
        marca: "MILWAKEE",
        modelo: "48-89-4621",
        valor: 185,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "PUNTAS PARA DESARMADOR TIPO ESTRELLA",
        marca: "",
        modelo: "",
        valor: 360,
        cantidad: 6,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "KIT DE PROBADOR SCOUT",
        marca: "KLEIN TOOLS",
        modelo: "VDV501-851",
        valor: 2582.41,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "BOLSO MULTIUSOS P/HTA",
        marca: "HUSKY",
        modelo: "46181500",
        valor: 725,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "REFORZADOR MAGNETICO",
        marca: "MILWAKEE",
        modelo: "T-04765",
        valor: 99,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "EXTENSION PARA DESARMADOR",
        marca: "",
        modelo: "",
        valor: 22,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "LLAVE DE TUERCAS HEXAGONAL",
        marca: "MILWAKEE",
        modelo: "49-66-4505",
        valor: 95,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "TIJERAS PARA CORTAR LAMINA",
        marca: "MILWAKEE",
        modelo: "",
        valor: 435,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "DESARMADOR PARA ESCARIAR",
        marca: "KLEIN TOOLS",
        modelo: "",
        valor: 759,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "BATERIA DE 18 W",
        marca: "MAKITA",
        modelo: "",
        valor: 1500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "TROMPO",
        marca: "",
        modelo: "",
        valor: 0,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
    },
    {
        nombre: "ROTOMARTILLO",
        marca: "MAKITA",
        modelo: "",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68efe1e3b2d3e3a020a36c9d",
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