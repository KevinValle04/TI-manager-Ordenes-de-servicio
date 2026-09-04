import { Router, Request, Response, NextFunction } from 'express';
import { previewOrdenById } from '../controllers/ordenServicioController';
import OrdenCompra from '../models/OrdenCompra';

const router = Router();

// Vista previa HTML basada en plantilla
router.get('/:id/preview', (req: Request, res: Response, next: NextFunction) => previewOrdenById(req, res, next));

// Dev: listar primeros 5 IDs para pruebas
router.get('/list', async (req: Request, res: Response) => {
	try {
		const items = await OrdenCompra.find().select('_id numeroOrden').limit(5).lean();
		res.json(items.map(i => ({ _id: i._id, numeroOrden: (i as any).numeroOrden })));
	} catch (err) {
		console.error('Error listando ordenes:', err);
		res.status(500).json({ error: 'Error listando ordenes' });
	}
});

export default router;
