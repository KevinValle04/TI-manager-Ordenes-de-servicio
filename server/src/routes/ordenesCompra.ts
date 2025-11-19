import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import multer from 'multer';
import {
  crearOrdenCompraConPdf,
  crearOrdenDesdePdf,
  createOrdenCompra,
  deleteOrdenCompra,
  descargarPdfOrdenCompra,
  generarPdfOrdenCompra,
  getOrdenCompraById,
  getOrdenesByDateRange,
  getOrdenesByProveedor,
  getOrdenesByRazonSocial,
  getOrdenesCompra,
  getPdfOrdenCompra,
  procesarPdf,
  updateOrdenCompra,
  updateOrdenCompraConPdf
} from '../controllers/ordenCompraController';

const router = Router();

// Configuración de multer para carga de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = 'uploads/';
    // Crear directorio si no existe
    if (!require('fs').existsSync(uploadsDir)) {
      require('fs').mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Nombre único para evitar colisiones
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `orden-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      const error = new Error('Solo se permiten archivos PDF') as any;
      cb(error, false);
    }
  }
});

// Helper para manejar errores de funciones async
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Rutas principales para órdenes de compra
router.get('/', asyncHandler(getOrdenesCompra));
router.get('/fecha-rango', asyncHandler(getOrdenesByDateRange)); // Debe ir antes de /:id
router.get('/proveedor/:proveedorId', asyncHandler(getOrdenesByProveedor));
router.get('/razon-social/:razonSocialId', asyncHandler(getOrdenesByRazonSocial));
router.get('/:id', asyncHandler(getOrdenCompraById));
router.post('/', asyncHandler(createOrdenCompra));
router.put('/:id', asyncHandler(updateOrdenCompra));
router.put('/:id/actualizar-con-pdf', asyncHandler(updateOrdenCompraConPdf));
router.delete('/:id', asyncHandler(deleteOrdenCompra));

// Ruta para procesar PDFs
router.post('/procesar-pdf', upload.single('pdf'), asyncHandler(procesarPdf));

// Ruta para crear orden completa desde PDF con detección automática
router.post('/crear-desde-pdf', upload.single('pdf'), asyncHandler(crearOrdenDesdePdf));

// Nuevas rutas para generar PDF
router.post('/generar-pdf', asyncHandler(generarPdfOrdenCompra));
router.post('/crear-con-pdf', asyncHandler(crearOrdenCompraConPdf));
router.put('/:id/actualizar-con-pdf', asyncHandler(updateOrdenCompraConPdf));

// Ruta para actualizar orden con PDF
router.put('/:id/actualizar-con-pdf', asyncHandler(updateOrdenCompraConPdf));

// Rutas para obtener PDFs de órdenes específicas
router.get('/:id/pdf', asyncHandler(getPdfOrdenCompra)); // Ver PDF en el navegador
router.get('/:id/pdf/descargar', asyncHandler(descargarPdfOrdenCompra)); // Descargar PDF

export default router;
