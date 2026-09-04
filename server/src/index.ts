import express, { Application, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

// Importar todos los modelos para asegurar que estén registrados
import './models/Counter';
import './models/Colaborador';

import itemRoutes from "./routes/itemRoutes";
import vendedoresRoutes from './routes/vendedores'
import materialCanalizacionRoutes from './routes/materialCanalizacion'
import cotizacionCanalizacionRoutes from './routes/cotizacionCanalizacion'
import cotizacionRoutes from './routes/cotizacion'
import entregaRoutes from './routes/entrega'
import inventoryRoutes from "./routes/inventoryRoutes";
import inventoryMovementsRoutes from "./routes/inventoryMovementsRoutes";
import inventoryExteriorRoutes from "./routes/inventoryExteriorRoutes";
import inventoryMovementsExteriorRoutes from "./routes/inventoryMovementsExteriorRoutes";
import clientesRoutes from "./routes/clientes";
import proveedoresRoutes from "./routes/proveedores";
import razonesSocialesRoutes from "./routes/razonesSociales";
import guiasRoutes from "./routes/guias";
import ordenesCompraRoutes from "./routes/ordenesCompra";
import notificationConfigRoutes from "./routes/notificationConfigRoutes";
import { revisarYNotificarGuias } from "./notificacionService";
import "./cronNotificaciones";
import authRoutes from './routes/auth';
import { authMiddleware } from './routes/auth';
import colaboradoresRoutes from './routes/colaboradores';
import documentosRoutes from './routes/documentos';
import herramientasRoutes from './routes/herramientas';
import inventoryRequestsRoutes from './routes/inventoryRequests';
import solicitudesRoutes from './routes/solicitudes';
import proyectosRoutes from './routes/proyectos';
import actividadesRoutes from './routes/actividades';
import vehiculosRoutes from './routes/vehiculos';
import ordenesServicioRoutes from './routes/ordenesServicio';
import demoOrdenesRoutes from './routes/demoOrdenes';

dotenv.config();
const app: Application = express();
app.use(cors({
  origin: ['http://localhost', 'http://localhost:80', 'http://localhost:5173', 'http://192.168.100.150', 'http://192.168.100.150:80', 'http://timanager.com', 'http://www.timanager.com'],
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));

// Servir archivos estáticos
app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')));

mongoose.connect(process.env.MONGO_URI || "")
  .then(() => console.log("Conectado a MongoDB"))
  .catch((err) => console.error("Error al conectar a MongoDB:", err));

app.use("/api/items", itemRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use("/api/inventario", inventoryRoutes);
app.use("/api/cotizaciones", cotizacionRoutes);
app.use("/api/entregas", entregaRoutes);
app.use("/api/inventory-movements", inventoryMovementsRoutes);
app.use("/api/inventario-exterior", inventoryExteriorRoutes);
app.use("/api/inventory-movements-exterior", inventoryMovementsExteriorRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/proveedores", proveedoresRoutes);
app.use("/api/razones-sociales", razonesSocialesRoutes);
app.use("/api/guias", guiasRoutes);
app.use("/api/ordenes-compra", ordenesCompraRoutes);
app.use("/api/material-canalizacion", materialCanalizacionRoutes);
app.use("/api/cotizaciones-canalizacion", cotizacionCanalizacionRoutes);
app.use("/api/notification-config", notificationConfigRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/colaboradores', colaboradoresRoutes);
app.use('/api/documentos', documentosRoutes);
app.use('/api/herramientas', herramientasRoutes);
app.use('/api/inventory-requests', inventoryRequestsRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/proyectos', proyectosRoutes);
app.use('/api/actividades', actividadesRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
// Exponer imágenes de plantilla (server/src/templates/img)
app.use('/templates/img', express.static(path.join(__dirname, 'templates/img')));

// Registrar rutas de ordenes de servicio (vista previa + utilidades de prueba)
app.use('/api/ordenes-servicio', ordenesServicioRoutes);

// Ordenes de servicio de la demo (guardar/listar desde ordenes-servicio-demo)
app.use('/api/demo/ordenes', demoOrdenesRoutes);

// Demo HTML para visualizar el formulario sin depender del frontend
app.get('/demo/ordenes-servicio', (req: Request, res: Response) => {
  const demoPath = path.join(__dirname, '..', '..', 'ordenes-servicio-demo', 'ordenServicio_demo.html');
  res.sendFile(demoPath);
});

app.get('/demo/login', (req: Request, res: Response) => {
  const loginPath = path.join(__dirname, '..', '..', 'ordenes-servicio-demo', 'login.html');
  res.sendFile(loginPath);
});

app.post("/api/notificar-guias", async (req, res) => {
  try {
    if (req.headers["x-force-notify-between"] === "1") {
      process.env.FORCE_NOTIFY_BETWEEN = "1";
    } else {
      process.env.FORCE_NOTIFY_BETWEEN = undefined;
    }
    await revisarYNotificarGuias();
    process.env.FORCE_NOTIFY_BETWEEN = undefined;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error enviando notificaciones" });
  }
});

// Para proteger rutas, usa: app.use('/api/loquesea', authMiddleware, rutasProtegidas)

const PORT = process.env.PORT || 6051;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
