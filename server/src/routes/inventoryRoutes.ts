import { Router, Request, Response } from "express";
import { InventoryItem, IInventoryItem } from "../models/InventoryItem";

const router: Router = Router();

// Obtener todos los artículos del inventario
router.get("/", async (_req: Request, res: Response) => {
  const items = await InventoryItem.find().populate('razonSocial', 'nombre rfc');
  res.json(items);
});

// Crear un nuevo artículo
router.post("/", async (req: Request, res: Response) => {
  const nuevoItem: IInventoryItem = new InventoryItem(req.body);
  await nuevoItem.save();
  await nuevoItem.populate('razonSocial', 'nombre rfc');
  res.json(nuevoItem);
});

// Actualizar un artículo existente
router.put("/:id", async (req: Request, res: Response) => {
  const itemActualizado = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('razonSocial', 'nombre rfc');
  res.json(itemActualizado);
});

// Eliminar un artículo
router.delete("/:id", async (req: Request, res: Response) => {
  await InventoryItem.findByIdAndDelete(req.params.id);
  res.json({ message: "Artículo eliminado del inventario" });
});

export default router;
