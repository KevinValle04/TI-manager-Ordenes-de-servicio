import { RequestHandler } from 'express';
import { InventoryRequest } from '../models/InventoryRequest';
import { InventoryItem } from '../models/InventoryItem';
import { InventoryExteriorItem } from '../models/InventoryExteriorItem';
import mongoose from 'mongoose';

interface PopulatedRequest {
  _id: string;
  tipoMovimiento: string;
  inventarioTipo: string;
  itemId: any;
  cantidad: number;
  solicitanteId: any;
  estado: string;
  fechaSolicitud: Date;
  motivoSolicitud: string;
  motivoRechazo?: string;
  aprobadorId?: any;
  fechaAprobacion?: Date;
  numerosSerie?: string[];
}

export class InventoryRequestController {
  // Crear una nueva solicitud
  public static createRequest: RequestHandler = async (req, res, next) => {
    try {
      // Verificar autenticación
      if (!req.user?._id) {
        res.status(401).json({ message: 'No autorizado. Por favor, inicie sesión.' });
        return;
      }

      const {
        tipoMovimiento,
        inventarioTipo,
        itemId,
        cantidad,
        motivoSolicitud,
        numerosSerie
      } = req.body;

      // Verificar que el item existe
      const ItemModel = inventarioTipo === 'INTERIOR' ? InventoryItem : InventoryExteriorItem;
      const item = await ItemModel.findById(itemId);

      if (!item) {
        res.status(404).json({ message: 'Item no encontrado' });
        return;
      }

      // Validaciones específicas según el tipo de movimiento
      if (tipoMovimiento === 'SALIDA') {
        // Verificar disponibilidad
        if (item.cantidad < cantidad) {
          res.status(400).json({ 
            message: 'No hay suficiente cantidad disponible' 
          });
          return;
        }

        // Validar números de serie si se proporcionan
        if (numerosSerie && numerosSerie.length > 0) {
          const seriesValidas = numerosSerie.every((serie: string) => 
            item.numerosSerie.includes(serie)
          );
          
          if (!seriesValidas) {
            res.status(400).json({ 
              message: 'Algunos números de serie no son válidos' 
            });
            return;
          }
        }
      }

      // Verificar autenticación y obtener el ID del usuario
      const userId = req.user?._id;
      console.log('Usuario que intenta crear la solicitud:', {
        userId,
        userInfo: req.user
      });

      // Crear la solicitud
      const request = new InventoryRequest({
        tipoMovimiento,
        inventarioTipo,
        itemId,
        cantidad,
        solicitanteId: userId,
        estado: 'PENDIENTE',
        motivoSolicitud,
        numerosSerie,
        fechaSolicitud: new Date()
      });
      
      console.log('Creando solicitud con datos:', {
        tipoMovimiento,
        inventarioTipo,
        itemId,
        cantidad,
        solicitanteId: req.user._id,
        estado: 'PENDIENTE',
        motivoSolicitud
      });

      await request.save();

      res.status(201).json({
        message: 'Solicitud creada exitosamente',
        request
      });

    } catch (error) {
      console.error('Error al crear solicitud:', error);
      res.status(500).json({ 
        message: 'Error al crear la solicitud',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      return;
    }
  }

  // Obtener solicitudes pendientes (para administradores)
  public static getPendingRequests: RequestHandler = async (req, res, next) => {
    try {
      console.log('Buscando solicitudes pendientes...');
      
      // Obtener solicitudes pendientes con el solicitante populado
      const requests = await InventoryRequest.find({ estado: 'PENDIENTE' })
        .populate('solicitanteId', 'username')
        .sort({ fechaSolicitud: -1 })
        .lean();

      // Popular los items manualmente
      const populatedRequests: PopulatedRequest[] = await Promise.all(
        requests.map(async (request: any) => {
          const ItemModel = request.inventarioTipo === 'INTERIOR' ? 
            InventoryItem : InventoryExteriorItem;
          
          try {
            const item = await ItemModel.findById(request.itemId).lean();
            return {
              ...request,
              itemId: item || null
            };
          } catch (err) {
            console.error(`Error al obtener item para solicitud ${request._id}:`, err);
            return request;
          }
        })
      );

      console.log('Solicitudes encontradas:', populatedRequests.length);
      res.json(populatedRequests);
      return;
    } catch (error) {
      console.error('Error al obtener solicitudes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Detalles del error:', errorMessage);
      res.status(500).json({ 
        message: 'Error al obtener las solicitudes',
        error: errorMessage
      });
    }
  }

  // Obtener solicitudes de un usuario
  public static getUserRequests: RequestHandler = async (req, res, next) => {
    try {
      if (!req.user?._id) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }
      
      const userId = req.user._id as mongoose.Types.ObjectId;
      console.log('Buscando solicitudes para usuario:', userId);
      
      // Obtener todas las solicitudes del usuario (pendientes y procesadas)
      console.log('User ID para búsqueda:', userId);
      const requests = await InventoryRequest.find({ 
        solicitanteId: userId.toString() 
      })
      .populate('solicitanteId', 'username')
      .populate('aprobadorId', 'username')
      .sort({ fechaSolicitud: -1 })
      .lean();
      
      console.log('Solicitudes encontradas en la base de datos:', requests.length);

      // Popular los items manualmente
      const populatedRequests: PopulatedRequest[] = await Promise.all(
        requests.map(async (request: any) => {
          const ItemModel = request.inventarioTipo === 'INTERIOR' ? 
            InventoryItem : InventoryExteriorItem;
          
          try {
            const item = await ItemModel.findById(request.itemId).lean();
            return {
              ...request,
              itemId: item || null
            };
          } catch (err) {
            console.error(`Error al obtener item para solicitud ${request._id}:`, err);
            return request;
          }
        })
      );

      res.json(populatedRequests);
    } catch (error) {
      console.error('Error al obtener solicitudes del usuario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Detalles del error:', errorMessage);
      res.status(500).json({ 
        message: 'Error al obtener las solicitudes',
        error: errorMessage
      });
      return;
    }
  }

  // Aprobar o rechazar una solicitud
  // Obtener historial de solicitudes (solo admin)
  public static getRequestHistory: RequestHandler = async (req, res, next) => {
    try {
      // Obtener solicitudes procesadas (aprobadas o rechazadas)
      const requests = await InventoryRequest.find({
        estado: { $in: ['APROBADA', 'RECHAZADA'] }
      })
      .populate('solicitanteId', 'username')
      .populate('aprobadorId', 'username')
      .sort({ fechaAprobacion: -1 })
      .lean();

      // Popular los items manualmente
      const populatedRequests: PopulatedRequest[] = await Promise.all(
        requests.map(async (request: any) => {
          const ItemModel = request.inventarioTipo === 'INTERIOR' ? 
            InventoryItem : InventoryExteriorItem;
          
          try {
            const item = await ItemModel.findById(request.itemId).lean();
            return {
              ...request,
              itemId: item || null
            };
          } catch (err) {
            console.error(`Error al obtener item para solicitud ${request._id}:`, err);
            return request;
          }
        })
      );

      res.json(populatedRequests);
    } catch (error) {
      console.error('Error al obtener historial de solicitudes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ 
        message: 'Error al obtener el historial',
        error: errorMessage
      });
      return;
    }
  }

  public static processRequest: RequestHandler = async (req, res, next) => {
    try {
      const { requestId } = req.params;
      const { action, motivoRechazo } = req.body;

      console.log('Procesando solicitud:', {
        requestId,
        action,
        motivoRechazo,
        userId: req.user?._id
      });

      const request = await InventoryRequest.findById(requestId);
      
      if (!request) {
        res.status(404).json({ message: 'Solicitud no encontrada' });
        return;
      }

      if (request.estado !== 'PENDIENTE') {
        res.status(400).json({ 
          message: 'Esta solicitud ya ha sido procesada' 
        });
        return;
      }

      const ItemModel = request.inventarioTipo === 'INTERIOR' ? 
        InventoryItem : InventoryExteriorItem;

      if (action === 'APROBAR') {
        const item = await ItemModel.findById(request.itemId);
        
        if (!item) {
          res.status(404).json({ message: 'Item no encontrado' });
          return;
        }

        // Validar disponibilidad para salidas
        if (request.tipoMovimiento === 'SALIDA' && 
            item.cantidad < request.cantidad) {
          res.status(400).json({ 
            message: 'No hay suficiente cantidad disponible' 
          });
          return;
        }

        // Actualizar inventario
        let updateQuery: any = {
          $inc: { cantidad: request.tipoMovimiento === 'ENTRADA' ? request.cantidad : -request.cantidad }
        };

        // Si hay números de serie, actualizarlos también
        if (request.numerosSerie && request.numerosSerie.length > 0) {
          if (request.tipoMovimiento === 'ENTRADA') {
            updateQuery = {
              ...updateQuery,
              $push: { numerosSerie: { $each: request.numerosSerie } }
            };
          } else {
            updateQuery = {
              ...updateQuery,
              $pull: { numerosSerie: { $in: request.numerosSerie } }
            };
          }
        }

        console.log('Actualizando inventario:', {
          itemId: request.itemId,
          updateQuery
        });

        await ItemModel.updateOne(
          { _id: request.itemId },
          updateQuery
        );

        // Actualizar solicitud
        request.estado = 'APROBADA';
        if (req.user?._id) {
          request.aprobadorId = req.user._id as mongoose.Types.ObjectId;
        }
        request.fechaAprobacion = new Date();
      } else {
        // Rechazar solicitud
        request.estado = 'RECHAZADA';
        request.motivoRechazo = motivoRechazo;
        if (req.user?._id) {
          request.aprobadorId = req.user._id as mongoose.Types.ObjectId;
        }
        request.fechaAprobacion = new Date();
      }

      console.log('Guardando cambios en la solicitud...');
      await request.save();

      console.log('Solicitud procesada exitosamente:', {
        id: request._id,
        estado: request.estado,
        aprobadorId: request.aprobadorId
      });

      res.json({
        message: `Solicitud ${action === 'APROBAR' ? 'aprobada' : 'rechazada'} exitosamente`,
        request
      });

    } catch (error) {
      console.error('Error al procesar solicitud:', error);
      
      // Determinar el tipo de error
      if (error instanceof mongoose.Error) {
        console.error('Error de MongoDB:', error);
        res.status(500).json({ 
          message: 'Error en la base de datos',
          error: error.message
        });
      } else if (error instanceof Error) {
        console.error('Error general:', error);
        res.status(500).json({ 
          message: 'Error al procesar la solicitud',
          error: error.message
        });
      } else {
        console.error('Error desconocido:', error);
        res.status(500).json({ 
          message: 'Error desconocido al procesar la solicitud'
        });
      }
    }
  }
}
