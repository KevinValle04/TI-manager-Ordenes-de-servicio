import { Router } from 'express';
import {
  obtenerProyectos,
  obtenerProyectoPorId,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto
} from '../controllers/proyectoController';

const router = Router();

// GET /api/proyectos - Obtener todos los proyectos
router.get('/', obtenerProyectos);

// GET /api/proyectos/:id - Obtener un proyecto por ID
router.get('/:id', obtenerProyectoPorId);

// POST /api/proyectos - Crear un nuevo proyecto
router.post('/', crearProyecto);

// PUT /api/proyectos/:id - Actualizar un proyecto
router.put('/:id', actualizarProyecto);

// DELETE /api/proyectos/:id - Eliminar un proyecto
router.delete('/:id', eliminarProyecto);

export default router;
