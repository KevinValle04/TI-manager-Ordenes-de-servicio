import mongoose from 'mongoose';
import dotenv from 'dotenv';
import RazonSocial from '../src/models/RazonSocial';

// Cargar variables de entorno
dotenv.config();

// Datos de las razones sociales
const razonesSociales = [
    {
        _id: "6862fdc8b5b4e21ebfbe6edf",
        nombre: "Leticia Muñoz Estrada",
        rfc: "MUEL770429AM2",
        emailEmpresa: "tiservicesmxl@gmail.com",
        telEmpresa: "686 326 4576, 686 326 8693",
        celEmpresa: "6861209321",
        direccionEmpresa: "AVENIDA ENCANTADAS 1009 \nLas Flores\n 21330 MEXICALI BAJA CALIFORNIA\n MEXICO",
        emailFacturacion: "facturacion@tiservicesmxli.com",
        direccionEnvio: [{
            nombre: "Oficinas",
            direccion: " Calle Presa Francisco Zarco #  929  Colonia 5 de Julio",
            telefono: "686 326 4576, 686 326 8693",
            contacto: "Alejandro Hernandez"
        }]
    },
    {
        _id: "68648989a4d63c8d2dd284ad",
        nombre: "TISERVICES SOLUTIONS NETWORKS",
        rfc: "TSN2307042D7",
        emailEmpresa: "tiservicesmxl@gmail.com",
        telEmpresa: "6863264576",
        celEmpresa: "6861209321",
        direccionEmpresa: "Calle Presa Francisco Zarco # 929\nCol. 5 de Julio",
        emailFacturacion: "contabilidad@tiservicesmxli.com",
        direccionEnvio: [{
            nombre: "Alejandro Hernandez Castillo ",
            direccion: "Calle Presa Francisco Zarco # 929\nCol. 5 de Julio",
            telefono: "6866061197",
            contacto: "Alejandro Hernandez Castillo "
        }]
    },
    {
        _id: "6876fb2a2fc0aff60bc92fc4",
        nombre: "ALEJANDRO HERNANDEZ CASTILLO",
        rfc: "HECA770812C69",
        emailEmpresa: "tiservicesmxl@gmail.com",
        telEmpresa: "6863264576",
        celEmpresa: "TI SERVICES",
        direccionEmpresa: "Ciclistas # 1095 Juventud 2000 Mexicali B.C CP 21353",
        emailFacturacion: "tiservicesmxl@gmail.com",
        direccionEnvio: [{
            nombre: "Alejandro Hernandez Castillo  / Karen Alejos",
            direccion: "Calle Presa Francisco Zarco 929 Col. 5 De Julio ",
            telefono: "6861209321",
            contacto: "Alejandro Hernandez"
        }]
    }
];

// Función principal
async function cargarRazonesSociales() {
    try {
        // Conectar a MongoDB
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('Conectado a MongoDB');

        // Crear las razones sociales
        for (const razonSocialData of razonesSociales) {
            // Convertir el string _id a ObjectId
            const razonSocial = new RazonSocial({
                ...razonSocialData,
                _id: new mongoose.Types.ObjectId(razonSocialData._id)
            });

            await razonSocial.save();
            console.log(`Razón Social ${razonSocialData.nombre} creada exitosamente`);
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
cargarRazonesSociales();