import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import {
  cambiarEstadoCotizacion,
  createCotizacionCanalizacion,
  deleteCotizacionCanalizacion,
  descargarPdfCotizacionCanalizacion,
  getCotizacionCanalizacionById,
  getCotizacionesCanalizacion,
  getPdfCotizacionCanalizacion,
  searchCotizacionesCanalizacion,
  updateCotizacionCanalizacion
} from '../controllers/cotizacionCanalizacionController';

const router = Router();

// Helper para manejar errores de funciones async
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Rutas para cotizaciones de canalización
router.get('/', asyncHandler(getCotizacionesCanalizacion));
router.get('/search', asyncHandler(searchCotizacionesCanalizacion));
router.get('/:id', asyncHandler(getCotizacionCanalizacionById));
router.post('/', asyncHandler(createCotizacionCanalizacion));
router.put('/:id', asyncHandler(updateCotizacionCanalizacion));
router.put('/:id/estado', asyncHandler(cambiarEstadoCotizacion));
router.delete('/:id', asyncHandler(deleteCotizacionCanalizacion));

// Rutas para PDFs
router.get('/:id/pdf', asyncHandler(getPdfCotizacionCanalizacion));
router.get('/:id/pdf/descargar', asyncHandler(descargarPdfCotizacionCanalizacion));

export default router;
