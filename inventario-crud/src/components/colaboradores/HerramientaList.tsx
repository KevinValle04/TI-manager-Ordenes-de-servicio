import { DeleteOutlined, EditOutlined, FilePdfOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Form, Input, InputNumber, message } from 'antd';
import axios from 'axios';
import React, { useState } from 'react';
import { crearSolicitud } from '../../utils/solicitudesService';

interface Herramienta {
  _id: string;
  nombre: string;
  marca: string;
  modelo: string;
  valor: number;
  serialNumber: string;
  fechaAsignacion: string;
}

interface HerramientaListProps {
  colaboradorId: string;
  herramientas: Herramienta[];
  onHerramientasChange: () => void;
}

const HerramientaList: React.FC<HerramientaListProps> = ({ 
  colaboradorId, 
  herramientas, 
  onHerramientasChange 
}) => {

  const [modalVisible, setModalVisible] = useState(false);
  const [editingHerramienta, setEditingHerramienta] = useState<Herramienta | null>(null);
  const [form] = Form.useForm();

  const handleAddOrEdit = async (values: any) => {
    try {
      if (editingHerramienta) {
        await axios.put(`http://localhost:6051/api/herramientas/${editingHerramienta._id}`, {
          ...values,
          colaboradorId
        });
        message.success('Herramienta actualizada correctamente');
      } else {
        // Crear solicitud para agregar herramienta
        const resp = await crearSolicitud({
          tipo: 'herramienta',
          recursoId: '',
          colaboradorId,
          accion: 'Agregar',
          detalles: { ...values }
        });
        if (resp.status === 201) {
          message.success('¡Solicitud enviada correctamente!');
        } else {
          message.info('Solicitud enviada, esperando confirmación.');
        }
      }
      setTimeout(() => {
        setModalVisible(false);
        form.resetFields();
      }, 100);
      setEditingHerramienta(null);
      onHerramientasChange();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al procesar la herramienta');
    }
  };

  const handleDelete = async (herramientaId: string) => {
    try {
      // Crear solicitud para eliminar herramienta
      const resp = await crearSolicitud({
        tipo: 'herramienta',
        recursoId: herramientaId,
        colaboradorId,
        accion: 'Regresar',
        detalles: {}
      });
      if (resp.status === 201) {
        message.success('¡Solicitud enviada correctamente!');
      } else {
        message.info('Solicitud enviada, esperando confirmación.');
      }
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

  return (
    <div>
      <div className="tools-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: 16
      }}>
        <h3 style={{ margin: 0 }}>Lista de Herramientas</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingHerramienta(null);
              form.resetFields();
              setModalVisible(!modalVisible);
            }}
          >
            {modalVisible ? 'Cancelar' : 'Agregar Herramienta'}
          </Button>
          <Button
            type="default"
            icon={<FilePdfOutlined />}
            onClick={() => {
              window.open(`http://localhost:6051/api/herramientas/pdf/${colaboradorId}`, '_blank');
            }}
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {modalVisible && (
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={editingHerramienta ? "Editar Herramienta" : "Nueva Herramienta"}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleAddOrEdit}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: 'Por favor ingresa el nombre' }]}
              >
                <Input 
                  placeholder="Ingrese el nombre"
                  allowClear
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item
                name="marca"
                label="Marca"
                rules={[{ required: true, message: 'Por favor ingresa la marca' }]}
              >
                <Input 
                  placeholder="Ingrese la marca"
                  allowClear
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item
                name="modelo"
                label="Modelo"
                rules={[{ required: true, message: 'Por favor ingresa el modelo' }]}
              >
                <Input 
                  placeholder="Ingrese el modelo"
                  allowClear
                  autoComplete="off"
                />
              </Form.Item>

              <Form.Item
                name="valor"
                label="Valor ($)"
                rules={[{ required: true, message: 'Por favor ingresa el valor' }]}
              >
                <InputNumber<number>
                  style={{ width: '100%' }}
                  formatter={(value) => value ? `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(displayValue) => {
                    const stringValue = displayValue?.replace(/\$\s?|(,*)/g, '') || '0';
                    return Number(stringValue);
                  }}
                  min={0}
                />
              </Form.Item>

              <Form.Item
                name="serialNumber"
                label="Número de Serie (S/N)"
                rules={[{ required: true, message: 'Por favor ingresa el número de serie' }]}
              >
                <Input 
                  placeholder="Ingrese el número de serie"
                  allowClear
                  autoComplete="off"
                />
              </Form.Item>
            </div>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button type="primary" htmlType="submit">
                {editingHerramienta ? 'Actualizar' : 'Guardar'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}

      <Card
        size="small"
        style={{ width: '100%', marginBottom: '8px', background: '#f5f5f5' }}
        bodyStyle={{ padding: '8px 16px' }}
      >
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ width: '200px', fontWeight: 'bold' }}>Nombre</span>
          <span style={{ width: '150px', fontWeight: 'bold' }}>Marca</span>
          <span style={{ width: '150px', fontWeight: 'bold' }}>Modelo</span>
          <span style={{ width: '120px', fontWeight: 'bold' }}>Valor</span>
          <span style={{ width: '150px', fontWeight: 'bold' }}>Número de Serie</span>
          <span style={{ width: '150px', fontWeight: 'bold' }}>Fecha de Asignación</span>
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {herramientas.map((herramienta) => (
          <Card
            key={herramienta._id}
            size="small"
            style={{ width: '100%' }}
            bodyStyle={{ padding: '8px 16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flex: 1 }}>
                <span style={{ width: '200px' }}><strong>{herramienta.nombre}</strong></span>
                <span style={{ width: '150px' }}>{herramienta.marca}</span>
                <span style={{ width: '150px' }}>{herramienta.modelo}</span>
                <span style={{ width: '120px' }}>${herramienta.valor.toFixed(2)}</span>
                <span style={{ width: '150px' }}>S/N: {herramienta.serialNumber}</span>
                <span style={{ width: '150px' }}>{new Date(herramienta.fechaAsignacion).toLocaleDateString()}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(herramienta)}
                />
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => handleDelete(herramienta._id)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>


    </div>
  );
};

export default HerramientaList;
