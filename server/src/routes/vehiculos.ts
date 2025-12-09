import { Router } from 'express';
import {
  getVehiculos,
  getVehiculoById,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo,
  registrarServicio,
  getHistorialServicios,
  getVehiculosProximosAServicio,
  getVehiculosServicioVencido,
  eliminarServicio
} from '../controllers/vehiculosController';

const router = Router();

// Rutas específicas primero (antes de las rutas con parámetros dinámicos)
router.get('/proximos-servicio', getVehiculosProximosAServicio);
router.get('/servicio-vencido', getVehiculosServicioVencido);

// Rutas generales de vehículos
router.get('/', getVehiculos);
router.get('/:id', getVehiculoById);
router.post('/', createVehiculo);
router.put('/:id', updateVehiculo);
router.delete('/:id', deleteVehiculo);

// Rutas de servicios
router.post('/:id/servicios', registrarServicio);
router.get('/:id/servicios', getHistorialServicios);
router.delete('/:id/servicios/:servicioId', eliminarServicio);

export default router;
