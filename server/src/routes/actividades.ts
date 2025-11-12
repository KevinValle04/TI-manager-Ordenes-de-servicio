import { Router } from 'express';
import {
  obtenerActividadPorId,
  actualizarActividad,
  eliminarActividad
} from '../controllers/actividadController';

const router = Router();

// GET /api/actividades/:id - Obtener una actividad por ID
router.get('/:id', obtenerActividadPorId);

// PUT /api/actividades/:id - Actualizar una actividad
router.put('/:id', actualizarActividad);

// DELETE /api/actividades/:id - Eliminar una actividad
router.delete('/:id', eliminarActividad);

export default router;
