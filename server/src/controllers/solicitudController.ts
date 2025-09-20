import Solicitud from '../models/Solicitud';
import { Request, Response } from 'express';

export const crearSolicitud = async (req: Request, res: Response) => {
  try {
    const solicitud = new Solicitud(req.body);
    await solicitud.save();
    res.status(201).json(solicitud);
  } catch (err) {
    res.status(400).json({ error: 'Error al crear solicitud', details: err });
  }
};

export const obtenerSolicitudes = async (req: Request, res: Response) => {
  try {
    const solicitudes = await Solicitud.find();
    res.json(solicitudes);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

export const actualizarSolicitud = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const solicitud = await Solicitud.findByIdAndUpdate(id, req.body, { new: true });
    res.json(solicitud);
  } catch (err) {
    res.status(400).json({ error: 'Error al actualizar solicitud' });
  }
};

export const eliminarSolicitud = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Solicitud.findByIdAndDelete(id);
    res.json({ message: 'Solicitud eliminada' });
  } catch (err) {
    res.status(400).json({ error: 'Error al eliminar solicitud' });
  }
};