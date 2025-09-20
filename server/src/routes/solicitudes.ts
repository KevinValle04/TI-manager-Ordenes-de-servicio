import { Router } from 'express';
import { crearSolicitud, obtenerSolicitudes, actualizarSolicitud, eliminarSolicitud } from '../controllers/solicitudController';

const router = Router();

router.post('/', crearSolicitud);
router.get('/', obtenerSolicitudes);
router.put('/:id', actualizarSolicitud);
router.delete('/:id', eliminarSolicitud);

export default router;