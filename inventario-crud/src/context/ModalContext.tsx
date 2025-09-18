import React, { createContext, useContext, useState } from 'react';

interface ModalContextType {
  modalCount: number;
  registerModal: () => number;
  unregisterModal: (id: number) => void;
}

export const ModalContext = createContext<ModalContextType>({
  modalCount: 0,
  registerModal: () => 0,
  unregisterModal: () => {},
});

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalCount, setModalCount] = useState(0);
  const [activeModals, setActiveModals] = useState<number[]>([]);

  const registerModal = () => {
    const newId = Date.now();
    setActiveModals(prev => [...prev, newId]);
    setModalCount(prev => prev + 1);
    return newId;
  };

  const unregisterModal = (id: number) => {
    setActiveModals(prev => prev.filter(modalId => modalId !== id));
    setModalCount(prev => Math.max(0, prev - 1));
  };

  return (
    <ModalContext.Provider value={{ modalCount, registerModal, unregisterModal }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};