import { Form, message } from 'antd';
import axios from 'axios';
import { useState } from 'react';

interface Herramienta {
  _id: string;
  nombre: string;
  marca: string;
  modelo: string;
  valor: number;
  cantidad: number;
  serialNumber: string;
  fechaAsignacion: string;
}

interface ApiError {
  message: string;
  status: number;
}

interface UseHerramientasProps {
  colaboradorId: string;
  onHerramientasChange: () => void;
  isAdmin?: boolean; // Nuevo prop para identificar si el usuario es admin
}

interface HerramientaFormData {
  nombre: string;
  marca: string;
  modelo: string;
  valor: number;
  serialNumber: string;
}

export const useHerramientas = ({ colaboradorId, onHerramientasChange, isAdmin = false }: UseHerramientasProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHerramienta, setEditingHerramienta] = useState<Herramienta | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAddOrEdit = async (values: Partial<Herramienta>) => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Los administradores pueden hacer cambios directamente
        if (editingHerramienta) {
          await axios.put(`${import.meta.env.VITE_API_URL}herramientas/${editingHerramienta._id}`, {
            ...values,
            colaboradorId
          });
          message.success('Herramienta actualizada correctamente');
        } else {
          await axios.post(`${import.meta.env.VITE_API_URL}herramientas`, {
            ...values,
            colaboradorId
          });
          message.success('Herramienta agregada correctamente');
        }
      } else {
        // Los usuarios normales crean una solicitud
        await axios.post(`${import.meta.env.VITE_API_URL}solicitudes`, {
          tipo: 'herramienta',
          accion: editingHerramienta ? 'Modificar' : 'Agregar',
          colaboradorId,
          recursoId: editingHerramienta?._id,
          detalles: values,
          estado: 'pendiente'
        });
        message.success('Solicitud enviada correctamente');
      }
      
      closeModal();
      onHerramientasChange();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al procesar la herramienta');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (herramientaId: string) => {
    try {
      if (isAdmin) {
        // Los administradores pueden eliminar directamente
        await axios.delete(`${import.meta.env.VITE_API_URL}herramientas/${herramientaId}`);
        message.success('Herramienta eliminada correctamente');
      } else {
        // Los usuarios normales crean una solicitud de eliminación
        await axios.post(`${import.meta.env.VITE_API_URL}solicitudes`, {
          tipo: 'herramienta',
          accion: 'Regresar',
          colaboradorId,
          recursoId: herramientaId,
          estado: 'pendiente'
        });
        message.success('Solicitud de eliminación enviada correctamente');
      }
      onHerramientasChange();
    } catch (error) {
      message.error('Error al procesar la operación');
    }
  };

  const openEditModal = (herramienta: Herramienta) => {
    setEditingHerramienta(herramienta);
    form.setFieldsValue(herramienta);
    setModalVisible(true);
  };

  const openAddModal = () => {
    setEditingHerramienta(null);
    form.resetFields();
    setModalVisible(true);
  };

  const closeModal = () => {
    setTimeout(() => {
      setModalVisible(false);
      form.resetFields();
      setEditingHerramienta(null);
    }, 100);
  };

  const exportToPdf = () => {
    window.open(`http://localhost:6051/api/herramientas/pdf/${colaboradorId}`, '_blank');
  };

  return {
    modalVisible,
    editingHerramienta,
    form,
    loading,
    handleAddOrEdit,
    handleDelete,
    openEditModal,
    openAddModal,
    closeModal,
    exportToPdf
  };
};