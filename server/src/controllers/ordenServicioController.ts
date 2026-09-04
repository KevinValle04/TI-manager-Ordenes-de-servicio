import { Request, Response, RequestHandler } from 'express';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import OrdenCompra from '../models/OrdenCompra';

export const previewOrdenById: RequestHandler = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const orden = await OrdenCompra.findById(id)
      .populate('proveedor')
      .populate('razonSocial')
      .populate('vendedor')
      .lean();

    if (!orden) { res.status(404).send('Orden no encontrada'); return; }

    const templatePath = path.join(__dirname, '../templates/ordenServicio_preview.html');
    if (!fs.existsSync(templatePath)) {
      res.status(500).send('Plantilla de vista previa no encontrada');
      return;
    }

    const raw = fs.readFileSync(templatePath, 'utf8');
    const tpl = Handlebars.compile(raw);

    // Mapear datos sencillos para la plantilla
    const data: any = {
      title: orden.datosOrden?.titulo || orden.numeroOrden || 'Orden de Servicio',
      noDoc: orden.numeroOrden || '',
      date: orden.fecha ? new Date(orden.fecha).toLocaleString() : '',
      clientName: (orden.proveedor as any)?.empresa || orden.datosOrden?.cliente || '',
      description: orden.datosOrden?.descripcion || '',
      photos: (orden.datosOrden?.photos || []).map((p: string) => p.startsWith('http') ? p : `/api/uploads/${p}`),
      signatureUrl: orden.datosOrden?.signature ? (orden.datosOrden.signature.startsWith('http') ? orden.datosOrden.signature : `/api/uploads/${orden.datosOrden.signature}`) : null
    };

    const html = tpl(data);
    res.send(html);
  } catch (err) {
    console.error('Error en previewOrdenById:', err);
    res.status(500).send('Error generando la vista previa');
  }
};

export default { previewOrdenById };
