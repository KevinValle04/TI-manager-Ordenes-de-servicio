import React from 'react';
import { Card, Badge, Button } from 'react-bootstrap';
import { Vehiculo } from '../../types';
import './VehiculoCard.css';

interface VehiculoCardProps {
  vehiculo: Vehiculo;
  onEdit: (vehiculo: Vehiculo) => void;
  onDelete: (id: string) => void;
  onRegistrarServicio: (vehiculo: Vehiculo) => void;
}

const VehiculoCard: React.FC<VehiculoCardProps> = ({
  vehiculo,
  onEdit,
  onDelete,
  onRegistrarServicio
}) => {
  const calcularDiasHastaServicio = (): number | null => {
    if (!vehiculo.proximoServicio) return null;
    const ahora = new Date();
    const proximo = new Date(vehiculo.proximoServicio);
    const diferencia = proximo.getTime() - ahora.getTime();
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
  };

  const obtenerEstadoServicio = () => {
    const dias = calcularDiasHastaServicio();
    
    if (dias === null) {
      return { estado: 'sin-registro', texto: 'Sin servicio registrado', variant: 'secondary' };
    }
    
    if (dias < 0) {
      return { estado: 'vencido', texto: `Vencido hace ${Math.abs(dias)} días`, variant: 'danger' };
    }
    
    if (dias === 0) {
      return { estado: 'hoy', texto: 'Servicio hoy', variant: 'warning' };
    }
    
    if (dias <= 30) {
      return { estado: 'proximo', texto: `En ${dias} días`, variant: 'warning' };
    }
    
    return { estado: 'al-dia', texto: `En ${dias} días`, variant: 'success' };
  };

  const formatearFecha = (fecha: Date | string | undefined): string => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const estadoServicio = obtenerEstadoServicio();

  return (
    <Card className={`vehiculo-card estado-${estadoServicio.estado}`}>
      <Card.Body>
        <div className="vehiculo-header">
          <div>
            <h4 className="vehiculo-titulo">{vehiculo.marca} {vehiculo.modelo}</h4>
            <p className="vehiculo-subtitulo">{vehiculo.año} • {vehiculo.color}</p>
          </div>
          <Badge bg={estadoServicio.variant} className="estado-badge">
            {estadoServicio.texto}
          </Badge>
        </div>

        <div className="vehiculo-info">
          {vehiculo.placas && (
            <div className="info-item">
              <i className="fas fa-id-card me-2"></i>
              <span className="info-label">Placas:</span>
              <span className="info-valor">{vehiculo.placas}</span>
            </div>
          )}
          
          {vehiculo.numeroSerie && (
            <div className="info-item">
              <i className="fas fa-hashtag me-2"></i>
              <span className="info-label">No. Serie:</span>
              <span className="info-valor">{vehiculo.numeroSerie}</span>
            </div>
          )}

          <div className="info-item">
            <i className="fas fa-wrench me-2"></i>
            <span className="info-label">Último Servicio:</span>
            <span className="info-valor">{formatearFecha(vehiculo.ultimoServicio)}</span>
          </div>

          <div className="info-item">
            <i className="fas fa-calendar-check me-2"></i>
            <span className="info-label">Próximo Servicio:</span>
            <span className="info-valor">{formatearFecha(vehiculo.proximoServicio)}</span>
          </div>

          {vehiculo.historialServicios && vehiculo.historialServicios.length > 0 && (
            <div className="info-item">
              <i className="fas fa-history me-2"></i>
              <span className="info-label">Servicios:</span>
              <span className="info-valor">{vehiculo.historialServicios.length}</span>
            </div>
          )}
        </div>

        <div className="vehiculo-acciones">
          <Button
            variant="success"
            size="sm"
            onClick={() => onRegistrarServicio(vehiculo)}
            className="flex-fill"
          >
            <i className="fas fa-tools me-2"></i>
            Registrar Servicio
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onEdit(vehiculo)}
          >
            <i className="fas fa-edit"></i>
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => onDelete(vehiculo._id!)}
          >
            <i className="fas fa-trash"></i>
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default VehiculoCard;
