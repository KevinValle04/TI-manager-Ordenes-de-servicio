import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import {
    cambiarEstadoCotizacion,
    createCotizacion,
    deleteCotizacion,
    descargarPdfChecklistCotizacion,
    descargarPdfCotizacion,
    getCotizacionById,
    getCotizaciones,
    getPdfChecklistCotizacion,
    getPdfCotizacion,
    searchCotizaciones,
    updateCotizacion
} from '../controllers/cotizacionController';

const router = Router();

// Helper para manejar errores de funciones async
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Rutas para cotizaciones
router.get('/', asyncHandler(getCotizaciones));
router.get('/search', asyncHandler(searchCotizaciones));
router.get('/:id', asyncHandler(getCotizacionById));
router.post('/', asyncHandler(createCotizacion));
router.put('/:id', asyncHandler(updateCotizacion));
router.put('/:id/estado', asyncHandler(cambiarEstadoCotizacion));
router.delete('/:id', asyncHandler(deleteCotizacion));

// Rutas para PDFs
router.get('/:id/pdf', asyncHandler(getPdfCotizacion));
router.get('/:id/pdf/descargar', asyncHandler(descargarPdfCotizacion));
router.get('/:id/pdf-checklist', asyncHandler(getPdfChecklistCotizacion));
router.get('/:id/pdf-checklist/descargar', asyncHandler(descargarPdfChecklistCotizacion));

export default router;