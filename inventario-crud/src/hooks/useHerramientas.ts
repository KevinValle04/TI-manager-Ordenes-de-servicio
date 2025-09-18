import { Form, message } from 'antd';
import axios from 'axios';
import { useState } from 'react';

interface Herramienta {
  _id: string;
  nombre: string;
  marca: string;
  modelo: string;
  valor: number;
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
}

interface HerramientaFormData {
  nombre: string;
  marca: string;
  modelo: string;
  valor: number;
  serialNumber: string;
}

export const useHerramientas = ({ colaboradorId, onHerramientasChange }: UseHerramientasProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHerramienta, setEditingHerramienta] = useState<Herramienta | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAddOrEdit = async (values: Partial<Herramienta>) => {
    setLoading(true);
    try {
      if (editingHerramienta) {
        await axios.put(`http://localhost:6051/api/herramientas/${editingHerramienta._id}`, {
          ...values,
          colaboradorId
        });
        message.success('Herramienta actualizada correctamente');
      } else {
        await axios.post('http://localhost:6051/api/herramientas', {
          ...values,
          colaboradorId
        });
        message.success('Herramienta agregada correctamente');
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
      await axios.delete(`http://localhost:6051/api/herramientas/${herramientaId}`);
      message.success('Herramienta eliminada correctamente');
      onHerramientasChange();
    } catch (error) {
      message.error('Error al eliminar la herramienta');
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