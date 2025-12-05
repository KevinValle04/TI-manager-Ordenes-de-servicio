import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  obtenerActividadPorId,
  actualizarActividad,
  eliminarActividad,
  subirEvidencia,
  eliminarEvidencia
} from '../controllers/actividadController';

const router = Router();

// Configurar multer para subir evidencias
const uploadsDir = path.join(__dirname, '../../uploads/evidencias');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `evidencia-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Aceptar solo imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, GIF)'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

// GET /api/actividades/:id - Obtener una actividad por ID
router.get('/:id', obtenerActividadPorId);

// PUT /api/actividades/:id - Actualizar una actividad
router.put('/:id', actualizarActividad);

// DELETE /api/actividades/:id - Eliminar una actividad
router.delete('/:id', eliminarActividad);

// POST /api/actividades/:id/evidencias - Subir evidencia a una actividad
router.post('/:id/evidencias', upload.single('evidencia'), subirEvidencia);

// DELETE /api/actividades/:id/evidencias/:evidenciaId - Eliminar una evidencia
router.delete('/:id/evidencias/:evidenciaId', eliminarEvidencia);

export default router;
