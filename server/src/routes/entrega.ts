import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import {
  cambiarEstadoEntrega,
  createEntrega,
  deleteEntrega,
  descargarPdfEntrega,
  getEntregaById,
  getEntregas,
  getPdfEntrega,
  searchEntregas,
  updateEntrega
} from '../controllers/entregaController';

const router = Router();

// Helper para manejar errores de funciones async
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Rutas para entregas
router.get('/', asyncHandler(getEntregas));
router.get('/search', asyncHandler(searchEntregas));
router.get('/:id', asyncHandler(getEntregaById));
router.post('/', asyncHandler(createEntrega));
router.put('/:id', asyncHandler(updateEntrega));
router.put('/:id/estado', asyncHandler(cambiarEstadoEntrega));
router.delete('/:id', asyncHandler(deleteEntrega));

// Rutas para PDFs
router.get('/:id/pdf', asyncHandler(getPdfEntrega));
router.get('/:id/pdf/descargar', asyncHandler(descargarPdfEntrega));

export default router;
