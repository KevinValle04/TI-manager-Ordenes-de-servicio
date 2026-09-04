import { Router, Request, Response } from 'express';
import OrdenServicioDemo from '../models/OrdenServicioDemo';

const router = Router();

// Guardar una orden de servicio enviada desde la demo (tecnico)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, folio } = req.body || {};
    if (!username || !folio) {
      res.status(400).json({ error: 'username y folio son obligatorios' });
      return;
    }
    const orden = await OrdenServicioDemo.create(req.body);
    res.status(201).json({ _id: orden._id, folio: orden.folio, guardadaEn: orden.guardadaEn });
  } catch (err) {
    console.error('Error guardando orden de servicio demo:', err);
    res.status(500).json({ error: 'Error guardando la orden' });
  }
});

// Listar todas las ordenes (admin), con filtros opcionales por tecnico y fecha
router.get('/', async (req: Request, res: Response) => {
  try {
    const filtro: Record<string, unknown> = {};
    if (req.query.username) filtro.username = String(req.query.username);
    if (req.query.fecha) filtro.fecha = String(req.query.fecha);
    const ordenes = await OrdenServicioDemo.find(filtro).sort({ guardadaEn: -1 }).lean();
    res.json(ordenes);
  } catch (err) {
    console.error('Error listando ordenes de servicio demo:', err);
    res.status(500).json({ error: 'Error listando las ordenes' });
  }
});

export default router;