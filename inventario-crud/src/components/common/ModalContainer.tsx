import React, { useEffect, useState, useCallback } from 'react';
import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import './ModalContainer.css';

// Contador global para los modales
let globalModalCount = 0;

interface ModalContainerProps extends ModalProps {
  children: React.ReactNode;
  zIndex?: number;
}

export const ModalContainer: React.FC<ModalContainerProps> = ({ 
  children, 
  open, 
  onCancel,
  zIndex: providedZIndex,
  ...props 
}) => {
  const [modalId] = useState(() => ++globalModalCount);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300); // Duración de la animación
      return () => clearTimeout(timer);
    }
  }, [open]);

  const baseZIndex = 1000;
  const calculatedZIndex = providedZIndex || baseZIndex + modalId * 10;

  return (
    <Modal
      {...props}
      open={open}
      onCancel={onCancel}
      maskClosable={false}
      keyboard={false}
      destroyOnClose
      className="modal-container"
      style={{ 
        ...props.style,
        zIndex: calculatedZIndex 
      }}
      maskStyle={{
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        zIndex: calculatedZIndex - 1
      }}
      wrapClassName={`modal-wrapper modal-level-${modalId}`}
      modalRender={(node) => (
        <div 
          style={{ 
            position: 'relative',
            zIndex: calculatedZIndex
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {node}
        </div>
      )}
    >
      {children}
    </Modal>
  );
};