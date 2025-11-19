import React from 'react';
import { Badge, Button, Form } from 'react-bootstrap';
import { formatearMoneda } from '../../utils/formatters';

interface TablaProductosProps {
  productos: any[];
  onActualizar: (index: number, campo: string, valor: any) => void;
  onAgregar: () => void;
  onResetearDescuentos?: () => void;
  moneda: string;
}

export const TablaProductos: React.FC<TablaProductosProps> = ({
  productos,
  onActualizar,
  onAgregar,
  onResetearDescuentos,
  moneda
}) => {
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="text-primary mb-0">
          <i className="fas fa-shopping-cart me-2"></i>
          Productos de la Orden {productos.length > 0 && 
            <Badge bg="info" className="ms-2">{productos.length} productos</Badge>
          }
        </h5>
      </div>
      
      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '12%' }}>Código</th>
              <th style={{ width: '30%' }}>Descripción</th>
              <th style={{ width: '8%' }}>Cantidad</th>
              <th style={{ width: '8%' }}>Unidad</th>
              <th style={{ width: '12%' }}>Precio Unitario</th>
              <th style={{ width: '8%' }}>Descuento</th>
              <th style={{ width: '17%' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {productos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  <i className="fas fa-box-open me-2"></i>
                  No hay productos en la orden. Haga clic en "Agregar Producto" para comenzar.
                </td>
              </tr>
            ) : (
              productos.map((producto, index) => (
                <FilaProducto
                  key={`producto-${index}`}
                  producto={producto}
                  index={index}
                  onActualizar={onActualizar}
                  moneda={moneda}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        {onResetearDescuentos && productos.length > 0 && (
          <Button 
            onClick={onResetearDescuentos}
            title="Poner todos los descuentos en 0%"
            style={{ 
              backgroundColor: '#FF6B35', 
              borderColor: '#FF6B35', 
              color: 'white',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#E55A2B';
              e.target.style.borderColor = '#E55A2B';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#FF6B35';
              e.target.style.borderColor = '#FF6B35';
            }}
          >
            <i className="fas fa-percent me-2"></i>
            Resetear Descuentos
          </Button>
        )}
        <Button 
          onClick={onAgregar}
          style={{ 
            backgroundColor: '#17A2B8', 
            borderColor: '#17A2B8', 
            color: 'white',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#138496';
            e.target.style.borderColor = '#138496';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#17A2B8';
            e.target.style.borderColor = '#17A2B8';
          }}
        >
          <i className="fas fa-plus me-2"></i>
          Agregar Producto
        </Button>
      </div>
    </div>
  );
};

interface FilaProductoProps {
  producto: any;
  index: number;
  onActualizar: (index: number, campo: string, valor: any) => void;
  moneda: string;
}

const FilaProducto: React.FC<FilaProductoProps> = React.memo(({ 
  producto, 
  index, 
  onActualizar,
  moneda 
}) => {
  const handleEliminarProducto = React.useCallback(() => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      onActualizar(index, 'eliminar', null);
    }
  }, [index, onActualizar]);

  const handleInputChange = React.useCallback((campo: string, valor: any) => {
    onActualizar(index, campo, valor);
  }, [index, onActualizar]);

  const importe = React.useMemo(() => {
    const subtotal = (Number(producto.cantidad) || 0) * (Number(producto.precioUnitario) || 0);
    const descuento = (Number(producto.descuento) || 0) / 100;
    return subtotal * (1 - descuento);
  }, [producto.cantidad, producto.precioUnitario, producto.descuento]);

  return (
    <tr>
      <td className="align-middle">
        <div className="d-flex align-items-center">
          <Badge bg="secondary" className="me-2">{index + 1}</Badge>
          <Button 
            variant="outline-danger"
            size="sm"
            onClick={handleEliminarProducto}
            title="Eliminar producto"
          >
            ×
          </Button>
        </div>
      </td>
      <td className="align-middle">
        <Form.Control
          type="text"
          size="sm"
          value={producto.clave || ''}
          onChange={(e) => handleInputChange('clave', e.target.value)}
          placeholder="Código"
        />
      </td>
      <td className="align-middle">
        <Form.Control
          as="textarea"
          rows={2}
          size="sm"
          value={producto.descripcion || ''}
          onChange={(e) => handleInputChange('descripcion', e.target.value)}
          placeholder="Descripción del producto"
        />
      </td>
      <td className="align-middle">
        <Form.Control
          type="number"
          size="sm"
          value={producto.cantidad || ''}
          onChange={(e) => handleInputChange('cantidad', parseFloat(e.target.value) || 0)}
          placeholder="0"
          min="0"
          step="0.01"
        />
      </td>
      <td className="align-middle">
        <Form.Control
          type="text"
          size="sm"
          value={producto.unidad || ''}
          onChange={(e) => handleInputChange('unidad', e.target.value)}
          placeholder="Unidad"
        />
      </td>
      <td className="align-middle">
        <Form.Control
          type="number"
          size="sm"
          value={producto.precioUnitario || ''}
          onChange={(e) => handleInputChange('precioUnitario', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </td>
      <td className="align-middle">
        <Form.Control
          type="number"
          size="sm"
          value={producto.descuento || ''}
          onChange={(e) => handleInputChange('descuento', parseFloat(e.target.value) || 0)}
          placeholder="0"
          min="0"
          max="100"
          step="0.1"
        />
        <small className="text-muted">%</small>
      </td>
      <td className="align-middle">
        <div className="fw-bold text-end">
          {formatearMoneda(importe, moneda)}
        </div>
      </td>
    </tr>
  );
});

FilaProducto.displayName = 'FilaProducto';

export default TablaProductos;