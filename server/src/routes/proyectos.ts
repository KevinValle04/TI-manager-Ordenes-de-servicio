import { Router } from 'express';
import {
  obtenerProyectos,
  obtenerProyectoPorId,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  obtenerCotizacionesProyecto,
  obtenerOrdenesCompraProyecto
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

// GET /api/proyectos/:id/cotizaciones - Obtener cotizaciones de un proyecto
router.get('/:id/cotizaciones', obtenerCotizacionesProyecto);

// GET /api/proyectos/:id/ordenes-compra - Obtener órdenes de compra de un proyecto
router.get('/:id/ordenes-compra', obtenerOrdenesCompraProyecto);

export default router;
