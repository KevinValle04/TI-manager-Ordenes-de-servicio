import { Router } from 'express';
import {
  obtenerProyectos,
  obtenerProyectoPorId,
  crearProyecto,
  actualizarProyecto,
  eliminarProyecto,
  obtenerCotizacionesProyecto,
  obtenerOrdenesCompraProyecto,
  obtenerEntregasProyecto
} from '../controllers/proyectoController';
import {
  obtenerActividadesProyecto,
  obtenerActividadPorId,
  crearActividad,
  actualizarActividad,
  eliminarActividad
} from '../controllers/actividadController';

import {
  obtenerDireccionesProyecto,
  crearDireccionIP,
  actualizarDireccionIP,
  eliminarDireccionIP,
  generarPDFDirecciones
} from '../controllers/direccionIPController';

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

// GET /api/proyectos/:id/entregas - Obtener entregas de un proyecto
router.get('/:id/entregas', obtenerEntregasProyecto);

// GET /api/proyectos/:proyectoId/actividades - Obtener todas las actividades de un proyecto
router.get('/:proyectoId/actividades', obtenerActividadesProyecto);

// POST /api/proyectos/:proyectoId/actividades - Crear una nueva actividad
router.post('/:proyectoId/actividades', crearActividad);

// Rutas de direcciones IP
router.get('/:proyectoId/direcciones/pdf', generarPDFDirecciones);
router.get('/:proyectoId/direcciones', obtenerDireccionesProyecto);
router.post('/:proyectoId/direcciones', crearDireccionIP);
router.put('/direcciones/:id', actualizarDireccionIP);
router.delete('/direcciones/:id', eliminarDireccionIP);

export default router;
