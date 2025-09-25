import { Router } from 'express';
import { crearSolicitud, obtenerSolicitudes, obtenerMisSolicitudesHerramientas, actualizarSolicitud, eliminarSolicitud } from '../controllers/solicitudController';

const router = Router();


import { isAuthenticated } from '../middleware/auth';

router.post('/', crearSolicitud);
router.get('/', obtenerSolicitudes);
// Nuevo endpoint para solicitudes de herramientas del usuario autenticado
router.get('/herramientas/mis-solicitudes', isAuthenticated, obtenerMisSolicitudesHerramientas);
router.put('/:id', actualizarSolicitud);
router.delete('/:id', eliminarSolicitud);

export default router;