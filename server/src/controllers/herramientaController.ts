import { Request, Response } from 'express';
import Herramienta, { IHerramienta } from '../models/Herramienta';
import { generatePDF } from '../services/herramientasPdfGenerator';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { IColaborador } from '../models/Colaborador';

// Obtener todas las herramientas
export const getHerramientas = async (req: Request, res: Response) => {
  try {
    const herramientas = await Herramienta.find({ activo: true });
    res.json(herramientas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener herramientas', error });
  }
};

// Obtener herramientas por colaborador
export const getHerramientasByColaborador = async (req: Request, res: Response) => {
  try {
    const { colaboradorId } = req.params;
    const herramientas = await Herramienta.find({ 
      colaboradorId,
      activo: true 
    });
    res.json(herramientas);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener herramientas del colaborador', error });
  }
};

// Crear una nueva herramienta
export const createHerramienta = async (req: Request, res: Response) => {
  try {
    const { nombre, marca, modelo, valor, serialNumber, colaboradorId } = req.body;

    // Verificar si ya existe una herramienta con el mismo número de serie
    const existingHerramienta = await Herramienta.findOne({ serialNumber });
    if (existingHerramienta) {
      return res.status(400).json({ message: 'Ya existe una herramienta con este número de serie' });
    }

    const herramienta = new Herramienta({
      nombre,
      marca,
      modelo,
      valor,
      serialNumber,
      colaboradorId
    });

    await herramienta.save();
    res.status(201).json(herramienta);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear herramienta', error });
  }
};

// Actualizar una herramienta
export const updateHerramienta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = req.body;

    // Si se está actualizando el número de serie, verificar que no exista duplicado
    if (update.serialNumber) {
      const existingHerramienta = await Herramienta.findOne({ 
        serialNumber: update.serialNumber,
        _id: { $ne: id }
      });
      if (existingHerramienta) {
        return res.status(400).json({ message: 'Ya existe una herramienta con este número de serie' });
      }
    }

    const herramienta = await Herramienta.findByIdAndUpdate(
      id,
      update,
      { new: true }
    );

    if (!herramienta) {
      return res.status(404).json({ message: 'Herramienta no encontrada' });
    }

    res.json(herramienta);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar herramienta', error });
  }
};

// Eliminar una herramienta (baja lógica)
export const deleteHerramienta = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const herramienta = await Herramienta.findByIdAndUpdate(
      id,
      { activo: false },
      { new: true }
    );

    if (!herramienta) {
      return res.status(404).json({ message: 'Herramienta no encontrada' });
    }

    res.json({ message: 'Herramienta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar herramienta', error });
  }
};

// Generar PDF de inventario de herramientas
export const generateHerramientasPDF = async (req: Request, res: Response) => {
  try {
    const { colaboradorId } = req.params;
    console.log('Generando PDF para colaborador ID:', colaboradorId);

    // Verificar que estemos conectados a la base de datos
    if (!mongoose.connection.readyState) {
      console.error('No hay conexión a la base de datos');
      return res.status(500).json({ message: 'Error de conexión a la base de datos' });
    }

    // Verificar que el ID sea válido
    if (!mongoose.Types.ObjectId.isValid(colaboradorId)) {
      console.log('ID de colaborador inválido:', colaboradorId);
      return res.status(400).json({ message: 'ID de colaborador inválido' });
    }

    // Obtener las herramientas del colaborador
    const herramientas = await Herramienta.find({ 
      colaboradorId,
      activo: true 
    }).lean();

    // Obtener información del colaborador
    const Colaborador = mongoose.model<IColaborador>('Colaborador');
    const colaborador = await Colaborador.findById(colaboradorId).lean();
    console.log('Resultado de búsqueda de colaborador:', colaborador);

    if (!colaborador) {
      console.log('Colaborador no encontrado para el ID:', colaboradorId);
      return res.status(404).json({ message: 'Colaborador no encontrado' });
    }

    // Preparar los datos para el template
    const fecha = new Date();
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = fecha.toLocaleString('es-MX', { month: 'long' });
    const año = fecha.getFullYear();
    
    // Convertir el logo a base64 para incluirlo en el PDF
    const logoPath = path.join(process.cwd(), '..', 'inventario-crud', 'src', 'templates', 'img', 'logo.png');
    console.log('Buscando logo en:', logoPath);
    let logoBase64 = '';
    
    try {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
        console.log('Logo cargado correctamente');
      } else {
        console.warn('No se encontró el archivo del logo en:', logoPath);
      }
    } catch (error) {
      console.warn('No se pudo cargar el logo:', error);
    }
    
    // Calcular el total de valores
    const totalValores = herramientas.reduce((sum, h) => sum + h.valor, 0);
    
    const templateData = {
      fecha: `${dia} de ${mes} del ${año}`,
      logoPath: logoBase64,
      nombreColaborador: colaborador.nombre,
      numeroEmpleado: colaborador.numeroEmpleado,
      herramientas: herramientas.map(h => ({
        ...h,
        valor: h.valor.toFixed(2),
        fechaAsignacion: new Date(h.fechaAsignacion).toLocaleDateString('es-MX')
      })),
      totalValores: totalValores.toFixed(2)
    };

    // Generar el PDF
    const templatePath = path.join(__dirname, '../templates/herramientas.html');
    const pdfBuffer = await generatePDF(templatePath, templateData);

    // Configurar headers para la descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=herramientas-${colaborador.numeroEmpleado}.pdf`);

    // Enviar el PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al generar PDF:', error);
    res.status(500).json({ message: 'Error al generar el PDF de herramientas' });
  }
};
