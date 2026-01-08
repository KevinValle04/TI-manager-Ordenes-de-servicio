import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button, Form, Badge } from 'react-bootstrap';
import { ItemCotizacionCanalizacion, MaterialCanalizacion } from '../../types';

interface ProductRowCanalizacionProps {
  item: Partial<ItemCotizacionCanalizacion>;
  index: number;
  isEditing: boolean;
  materiales: MaterialCanalizacion[];
  onUpdate: (index: number, field: string, value: any) => void;
  onDelete: (index: number) => void;
  onEdit: (index: number) => void;
  onCancelEdit: () => void;
  disabled: boolean;
  isNew?: boolean;
  onSave?: () => void;
}

const ProductRowCanalizacion: React.FC<ProductRowCanalizacionProps> = ({
  item,
  index,
  isEditing,
  materiales,
  onUpdate,
  onDelete,
  onEdit,
  onCancelEdit,
  disabled,
  isNew = false,
  onSave
}) => {
  const [productSearchTerm, setProductSearchTerm] = useState(item.descripcion || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [productSuggestions, setProductSuggestions] = useState<MaterialCanalizacion[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const formatearMoneda = (valor: number) => {
    return `$${valor.toLocaleString('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const updateDropdownPosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  };

  // Efecto para cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const importe = (item.cantidad || 1) * (item.precioUnitario || 0);

  const handleProductSearch = (value: string) => {
    setProductSearchTerm(value);
    onUpdate(index, 'descripcion', value);
    setSelectedIndex(-1);
    
    if (value.length > 1) {
      updateDropdownPosition();
      
      const searchTerms = value.toLowerCase().split(' ').filter(term => term.length > 0);
      
      const filtered = materiales.filter(material => {
        const combinedText = `${material.tipo} ${material.material} ${material.medida} ${material.proveedor || ''}`.toLowerCase();
        
        const matchesAllTerms = searchTerms.every(term => 
          combinedText.includes(term)
        );
        
        const matchesIndividualFields = searchTerms.some(term =>
          material.material.toLowerCase().includes(term) ||
          material.tipo.toLowerCase().includes(term) ||
          material.medida.toLowerCase().includes(term) ||
          (material.proveedor && material.proveedor.toLowerCase().includes(term))
        );
        
        return matchesAllTerms || matchesIndividualFields;
      });
      
      const sortedFiltered = filtered.sort((a, b) => {
        const aCombined = `${a.tipo} ${a.material} ${a.medida} ${a.proveedor || ''}`.toLowerCase();
        const bCombined = `${b.tipo} ${b.material} ${b.medida} ${b.proveedor || ''}`.toLowerCase();
        
        const aMatchesAll = searchTerms.every(term => aCombined.includes(term));
        const bMatchesAll = searchTerms.every(term => bCombined.includes(term));
        
        if (aMatchesAll && !bMatchesAll) return -1;
        if (!aMatchesAll && bMatchesAll) return 1;
        
        return aCombined.localeCompare(bCombined);
      });
      
      setProductSuggestions(sortedFiltered.slice(0, 10));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectProduct = (material: MaterialCanalizacion) => {
    const descripcion = `${material.tipo} - ${material.material} - ${material.medida}`;
    setProductSearchTerm(descripcion);
    onUpdate(index, 'descripcion', descripcion);
    onUpdate(index, 'precioUnitario', material.precio);
    onUpdate(index, 'materialCanalizacion', material._id);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || productSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < productSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : productSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < productSuggestions.length) {
          selectProduct(productSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const DropdownPortal = () => {
    if (!showSuggestions) return null;

    return createPortal(
      <div 
        ref={dropdownRef}
        className="bg-white border rounded shadow-lg" 
        style={{ 
          position: 'absolute',
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
          zIndex: 99999, 
          maxHeight: '300px', 
          overflowY: 'auto'
        }}
      >
        {productSuggestions.length > 0 ? (
          productSuggestions.map((material, suggestionIndex) => (
            <div
              key={material._id}
              className={`p-2 border-bottom cursor-pointer ${suggestionIndex === selectedIndex ? 'bg-primary text-white' : ''}`}
              onClick={() => selectProduct(material)}
              style={{ cursor: 'pointer', fontSize: '0.875rem' }}
              onMouseEnter={() => setSelectedIndex(suggestionIndex)}
            >
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <strong className={suggestionIndex === selectedIndex ? 'text-white' : 'text-primary'}>
                    {material.tipo}
                  </strong>
                  <span className="mx-1">-</span>
                  <strong>{material.material}</strong>
                  <br />
                  <small className={suggestionIndex === selectedIndex ? 'text-white-50' : 'text-muted'}>
                    <i className="fas fa-ruler me-1"></i>
                    {material.medida}
                    {material.proveedor && (
                      <>
                        <span className="mx-2">•</span>
                        <i className="fas fa-building me-1"></i>
                        {material.proveedor}
                      </>
                    )}
                  </small>
                </div>
                <div className="text-end">
                  <span className={`fw-bold ${suggestionIndex === selectedIndex ? 'text-white' : 'text-success'}`}>
                    {formatearMoneda(material.precio)}
                  </span>
                  <br />
                  <small className={suggestionIndex === selectedIndex ? 'text-white-50' : 'text-muted'}>
                    {material.unidad}
                  </small>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-3 text-center text-muted">
            <i className="fas fa-search me-2"></i>
            No se encontraron productos con "{productSearchTerm}"
          </div>
        )}
      </div>,
      document.body
    );
  };

  if (!isEditing) {
    return (
      <tr className={disabled ? 'table-secondary' : ''}>
        <td className="align-middle">
          <Badge bg="secondary">{isNew ? 'Nuevo' : index + 1}</Badge>
        </td>
        <td className="align-middle">{item.descripcion}</td>
        <td className="align-middle text-center">{item.cantidad}</td>
        <td className="align-middle text-end">{formatearMoneda(item.precioUnitario || 0)}</td>
        <td className="align-middle text-end fw-bold">{formatearMoneda(importe)}</td>
        <td className="align-middle">
          <div className="d-flex gap-1 justify-content-center">
            <Button 
              variant="warning" 
              size="sm"
              onClick={() => onEdit(index)}
              disabled={disabled}
              title="Editar producto"
            >
              <i className="fas fa-pencil-alt me-1"></i>
              Editar
            </Button>
            <Button 
              variant="danger" 
              size="sm"
              onClick={() => onDelete(index)}
              disabled={disabled}
              title="Eliminar producto"
            >
              <i className="fas fa-trash-alt me-1"></i>
              Eliminar
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="table-warning">
        <td className="align-middle">
          <Badge bg="warning">{isNew ? 'Nuevo' : index + 1}</Badge>
        </td>
        <td className="align-middle">
          <Form.Control
            ref={inputRef}
            as="textarea"
            rows={2}
            size="sm"
            value={productSearchTerm}
            onChange={(e) => handleProductSearch(e.target.value)}
            onFocus={updateDropdownPosition}
            onKeyDown={handleKeyDown}
            placeholder="Buscar material (ej: 'Tubo 3/4', 'PD Metálico', 'DIAR 1/2')..."
            autoComplete="off"
          />
        </td>
        <td className="align-middle">
          <Form.Control
            type="number"
            size="sm"
            value={item.cantidad || 1}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate(index, 'cantidad', val === '' ? '' : parseFloat(val) || 0);
            }}
            onBlur={(e) => {
              if (e.target.value === '' || parseFloat(e.target.value) === 0) {
                onUpdate(index, 'cantidad', 1);
              }
            }}            min="1"
            step="0.01"
            placeholder="0"
          />
        </td>
        <td className="align-middle">
          <Form.Control
            type="number"
            size="sm"
            value={item.precioUnitario || 0}
            onChange={(e) => {
              const val = e.target.value;
              onUpdate(index, 'precioUnitario', val === '' ? '' : parseFloat(val) || 0);
            }}
            onBlur={(e) => {
              if (e.target.value === '') {
                onUpdate(index, 'precioUnitario', 0);
              }
            }}            min="0"
            step="0.01"
            placeholder="0.00"
          />
        </td>
        <td className="align-middle">
          <div className="fw-bold text-end">
            {formatearMoneda(importe)}
          </div>
        </td>
        <td className="align-middle">
          <div className="d-flex gap-1 justify-content-center">
            {isNew ? (
              <>
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={onSave}
                  disabled={!item.descripcion || !item.cantidad || !item.precioUnitario}
                  title="Guardar producto"
                >
                  <i className="fas fa-check me-1"></i>
                  Guardar
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={onCancelEdit}
                  title="Cancelar"
                >
                  <i className="fas fa-times me-1"></i>
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="success" 
                  size="sm"
                  onClick={() => onUpdate(index, 'save', true)}
                  disabled={!item.descripcion || !item.cantidad || !item.precioUnitario}
                  title="Guardar cambios"
                >
                  <i className="fas fa-save me-1"></i>
                  Guardar
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={onCancelEdit}
                  title="Cancelar edición"
                >
                  <i className="fas fa-times me-1"></i>
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </td>
      </tr>
      <DropdownPortal />
    </>
  );
};

export default ProductRowCanalizacion;
