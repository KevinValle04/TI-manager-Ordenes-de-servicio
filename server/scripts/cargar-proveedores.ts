import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Proveedor from '../src/models/Proveedor';

// Cargar variables de entorno
dotenv.config();

// Datos de los proveedores
const proveedores = [
    {
        _id: "6862fd94b5b4e21ebfbe6ed6",
        empresa: "SYSCOM",
        direccion: "Blvrd Federico Benítez López 8800, 22115",
        telefono: "664 655 1008",
        contactos: [{
            nombre: "RUBÉN ARREOLA ARECHIGA",
            puesto: " EJECUTIVO VENTAS",
            correo: "RUBEN.ARREOLA@SYSCOM.MX",
            telefono: "664 655 1008",
            extension: "4919"
        }]
    },
    {
        _id: "686487daa4d63c8d2dd2849f",
        empresa: "PORTENNTUM SA DE CV",
        direccion: "Ave. Revolucion # 111 Col. Buenos Aires Monterrey Nuevo",
        telefono: "8186255300",
        contactos: [{
            nombre: "Claudia Ochoa",
            puesto: "Ventas",
            correo: "claudia.ochoa@portenntum.com",
            telefono: "6643759243",
            extension: ""
        }]
    },
    {
        _id: "6879a29033809a2df9e9ab7c",
        empresa: "TVC",
        direccion: "Calle Datil No. 6176 Col. Los Arboles CP 22117, Tijuana BC",
        telefono: "664 4 74 92 57",
        contactos: [
            {
                nombre: "Juan Nuñez",
                puesto: "Jefe de ventas",
                correo: "juan.nunez@tvc.mx",
                telefono: "664 749257",
                extension: ""
            },
            {
                nombre: "Maria del Carmen Gutierrez Garcia",
                puesto: "Ventas",
                correo: "carmen.garcia@tvc.mx",
                telefono: "664 980-7521",
                extension: "263370"
            }
        ]
    },
    {
        _id: "6879a29633809a2df9e9ab83",
        empresa: "GRUPO DICE",
        direccion: "Calle Baburias No.13991 Col.Santa Cruz Tijuana BC",
        telefono: "664 288 2002",
        contactos: [{
            nombre: "Miranda Robles",
            puesto: "Vendedora",
            correo: "mrobles@grupo-dice.com",
            telefono: "6642882000",
            extension: "1550"
        }]
    },
    {
        _id: "687bc2cb33809a2df9e9ad36",
        empresa: "SENSA",
        direccion: "Lazaro Cardenas 1377 Col. Independencia CP 21290",
        telefono: "686 565 5526",
        contactos: [{
            nombre: "Andres Granados",
            puesto: "Vendedor ",
            correo: "",
            telefono: "686 621 8301",
            extension: ""
        }]
    },
    {
        _id: "687bc85733809a2df9e9ad84",
        empresa: "ELECTRICA DIAZ",
        direccion: "Blvr. Castellon 2095 Col. Hidalgo CP 21389",
        telefono: "686 561 6706",
        contactos: [{
            nombre: "Juan Gabriel Aguirre ",
            puesto: "Vendedor",
            correo: "jgabrielaguirre@electricadiaz.com",
            telefono: "686 561 67 06",
            extension: ""
        }]
    }
];

// Función principal
async function cargarProveedores() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Conectado a MongoDB');

        // Crear los proveedores
        for (const proveedorData of proveedores) {
            // Convertir el string _id a ObjectId
            const proveedor = new Proveedor({
                ...proveedorData,
                _id: new mongoose.Types.ObjectId(proveedorData._id)
            });

            await proveedor.save();
            console.log(`Proveedor ${proveedorData.empresa} creado exitosamente`);
        }

        console.log('Proceso completado exitosamente');
    } catch (error) {
        console.error('Error durante el proceso:', error);
    } finally {
        // Cerrar conexión
        await mongoose.connection.close();
        console.log('Conexión a MongoDB cerrada');
    }
}

// Ejecutar la función
cargarProveedores();