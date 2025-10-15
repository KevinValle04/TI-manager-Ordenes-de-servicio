import mongoose from 'mongoose';
import Herramienta from '../src/models/Herramienta';
import Colaborador from '../src/models/Colaborador';
import dotenv from 'dotenv';

dotenv.config();

// Array de herramientas a cargar
const herramientas = [
    {
        nombre: "TALADRO",
        marca: "MILWAKEE",
        modelo: "2607-20",
        valor: 6048,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "ATORNILLADOR",
        marca: "MILWAKEE",
        modelo: "2656-20",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "BATERIAS",
        marca: "MILWAKEE",
        modelo: "B22XDCA",
        valor: 0,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "CARGADOR",
        marca: "MILWAKEE",
        modelo: "48-59-1812",
        valor: 0,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "GUIA",
        marca: "KLEIN",
        modelo: "",
        valor: 810,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZAS PONCHADORAS",
        marca: "PALADIN",
        modelo: "",
        valor: 780,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "DESAMADORES PALETA/ESTRELLA",
        marca: "HUSKY",
        modelo: "",
        valor: 360,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZA DE PRESION",
        marca: "MILWAKEE",
        modelo: "",
        valor: 403,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "REMATADORA DE IMPACTO",
        marca: "FLUKE",
        modelo: "D1914",
        valor: 1800,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "TESTER",
        marca: "XDVCOLTPRO3",
        modelo: "",
        valor: 450,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "DESARMADORES INSULADOS 3 PZAS",
        marca: "COMERICAL ELECTRIC",
        modelo: "1011098870",
        valor: 357,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZ ELECTRICA CON CORTE",
        marca: "COMERCIAL ELECTRIC",
        modelo: "1011098873",
        valor: 462,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "FINDER BRAKER TESTER",
        marca: "KLEIN TOOLS",
        modelo: "ET310",
        valor: 1250,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "CINTA DE MEDIR",
        marca: "MILWAKEE",
        modelo: "",
        valor: 250,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "CAJA DE HERRAMIENTAS CON LLANTAS",
        marca: "MILWAKEE",
        modelo: "",
        valor: 3838,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "CAJA 16X22X6",
        marca: "MILWAKEE",
        modelo: "",
        valor: 3510,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZA ALTO PODER ELECTRICA",
        marca: "",
        modelo: "27112105",
        valor: 264,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZA CORTE DIAGONAL 8",
        marca: "",
        modelo: "27111900",
        valor: 110,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PROBADOR DE CABLE DE DATOS LAN",
        marca: "KLEIN TOOLS",
        modelo: "VDV526-200",
        valor: 2500,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "ESMERILADORA 268620",
        marca: "MILWAKEE",
        modelo: "",
        valor: 3546,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "BATERIA DE REPUESTO 18V 5 A",
        marca: "MILWAKEE",
        modelo: "",
        valor: 4536,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "CORTADOR DE TUBO",
        marca: "TRUPER",
        modelo: "",
        valor: 300,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZA DE CORTE PARA LAMINA",
        marca: "",
        modelo: "",
        valor: 400,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "BROCA DE ¼",
        marca: "MILWAKEE",
        modelo: "48-89-2313",
        valor: 119,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "BROCA DE 3/8",
        marca: "MILWAKEE",
        modelo: "48-89-4621",
        valor: 185,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "BROCA PARA TALADRO RED HELIX ½",
        marca: "MILWAKEE",
        modelo: "48-89-4626",
        valor: 579,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PUNTAS PARA DESARMADOR TIPO ESTRELLA",
        marca: "",
        modelo: "",
        valor: 360,
        cantidad: 6,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "EXTENSION PARA DESARMADOR",
        marca: "",
        modelo: "",
        valor: 44,
        cantidad: 2,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "TIJERAS PARA CORTAR LAMINA",
        marca: "MILWAKEE",
        modelo: "",
        valor: 435,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "TROMPO DE 3/8 DIAMETRO",
        marca: "LENOX",
        modelo: "30882VB2",
        valor: 990,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "TROMPO DE 3/8",
        marca: "TRUPER",
        modelo: "12126",
        valor: 499,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "BATERIA M12",
        marca: "MILWAKEE",
        modelo: "48-14-2403",
        valor: 1155,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZA DE CORTE 7'",
        marca: "HUSKY",
        modelo: "",
        valor: 299,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "DESARMADOR PARA ESCARIAR",
        marca: "KLEIN TOOLS",
        modelo: "",
        valor: 759,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "ZOZO",
        marca: "MILWAKEE",
        modelo: "2520-20",
        valor: 5000,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PORTAHERRAMIENTAS DE 26.6 X 26.8 CM",
        marca: "MCGUIRE-NICHOLAS",
        modelo: "",
        valor: 175,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PINZAS EN DIAGONAL DE 17.7 CM ACERO",
        marca: "HUSKY",
        modelo: "",
        valor: 269,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "PISTOLA DE SILICON",
        marca: "INGCO",
        modelo: "CGGLI2001",
        valor: 189,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
    {
        nombre: "KIT DE CARGADOR Y BATERIA PISTOLA SILICON",
        marca: "INGCO",
        modelo: "UFBCPK1214",
        valor: 854,
        cantidad: 1,
        serialNumber: "",
        colaboradorId: "68c991ace7b062f01a1a3ca3",
    },
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