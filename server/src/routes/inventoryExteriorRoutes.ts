import { Router, Request, Response } from "express";
import { InventoryExteriorItem, IInventoryExteriorItem } from "../models/InventoryExteriorItem";

const router: Router = Router();

// Obtener todos los artículos del inventario exterior
router.get("/", async (_req: Request, res: Response) => {
  const items = await InventoryExteriorItem.find().populate('razonSocial', 'nombre rfc');
  res.json(items);
});

// Crear un nuevo artículo
router.post("/", async (req: Request, res: Response) => {
  const nuevoItem: IInventoryExteriorItem = new InventoryExteriorItem(req.body);
  await nuevoItem.save();
  await nuevoItem.populate('razonSocial', 'nombre rfc');
  res.json(nuevoItem);
});

// Actualizar un artículo existente
router.put("/:id", async (req: Request, res: Response) => {
  const itemActualizado = await InventoryExteriorItem.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('razonSocial', 'nombre rfc');
  res.json(itemActualizado);
});

// Eliminar un artículo
router.delete("/:id", async (req: Request, res: Response) => {
  await InventoryExteriorItem.findByIdAndDelete(req.params.id);
  res.json({ message: "Artículo eliminado del inventario exterior" });
});

export default router;
