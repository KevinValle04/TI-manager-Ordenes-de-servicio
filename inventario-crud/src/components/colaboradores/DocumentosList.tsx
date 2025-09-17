import React, { useState } from 'react';
import { Card, Button, Form, DatePicker, message, Upload, Tooltip, Modal } from 'antd';
import { PlusOutlined, DeleteOutlined, FileOutlined, EditOutlined, CalendarOutlined, InboxOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

const urlServer = import.meta.env.VITE_API_URL;
const { Dragger } = Upload;
import './DocumentosList.css';

interface Documento {
  _id: string;
  nombre: string;
  url: string;
  tipo: 'pdf' | 'image';
  fechaSubida: string;
  fechaVencimiento?: string;
}

interface DocumentosListProps {
  colaboradorId: string;
  documentos: Documento[];
  onDocumentosChange: () => void;
}

const DocumentosList: React.FC<DocumentosListProps> = ({
  colaboradorId,
  documentos,
  onDocumentosChange
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedDocumento, setSelectedDocumento] = useState<Documento | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleAddDocument = async (values: { nombre: string; archivo: any[]; fechaVencimiento?: moment.Moment }) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('nombre', values.nombre);
      
      // Asegurarse de que el archivo se adjunte correctamente
      if (values.archivo && values.archivo.length > 0) {
        const file = values.archivo[0].originFileObj;
        formData.append('documento', file); // Cambiar 'archivo' por 'documento' para coincidir con el backend
      }

      if (values.fechaVencimiento) {
        formData.append('fechaVencimiento', values.fechaVencimiento.toISOString());
      }

      const response = await axios.post(
        `${urlServer}documentos/${colaboradorId}`,
        formData,
        { 
          headers: { 
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Respuesta del servidor:', response.data);
      message.success('Documento agregado correctamente');
      form.resetFields();
      setModalVisible(false);
      onDocumentosChange();
    } catch (error: any) {
      console.error('Error al agregar documento:', error);
      if (error.response?.data?.error) {
        message.error(`Error: ${error.response.data.error}`);
      } else {
        message.error('Error al agregar el documento');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentoId: string) => {
    try {
      await axios.delete(`${urlServer}documentos/${documentoId}`);
      message.success('Documento eliminado correctamente');
      onDocumentosChange();
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      message.error('Error al eliminar documento');
    }
  };

  return (
    <div>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={() => setModalVisible(true)}
        style={{ marginBottom: 16 }}
      >
        Agregar Documento
      </Button>

      <Modal
        title="Agregar Documento"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleAddDocument}>
          <Form.Item
            name="nombre"
            label="Nombre del documento"
            rules={[{ required: true, message: 'Por favor ingrese un nombre' }]}
          >
            <input type="text" />
          </Form.Item>

          <Form.Item
            name="archivo"
            label="Archivo"
            rules={[{ required: true, message: 'Por favor seleccione un archivo' }]}
          >
            <Upload.Dragger
              name="archivo"
              multiple={false}
              beforeUpload={() => false}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Haga clic o arrastre un archivo a esta área</p>
              <p className="ant-upload-hint">
                Archivos permitidos: PDF, JPG, PNG, GIF, WEBP
              </p>
            </Upload.Dragger>
          </Form.Item>

          <Form.Item
            name="fechaVencimiento"
            label="Fecha de vencimiento (opcional)"
          >
            <DatePicker />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Subir Documento
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      <div className="documentos-grid">
        {documentos.map((doc) => (
          <Card
            key={doc._id}
            size="small"
            title={doc.nombre}
            className="documento-card"
            extra={
              <div className="documento-actions">
                <Tooltip title="Editar">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => {
                      setSelectedDocumento(doc);
                      setEditModalVisible(true);
                    }}
                  />
                </Tooltip>
                <Tooltip title="Eliminar">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDeleteDocument(doc._id)}
                  />
                </Tooltip>
              </div>
            }
          >
            <Button
              className="documento-view-button"
              type="link"
              block
              icon={<FileOutlined />}
              onClick={() => {
                const fileName = doc.url.split('/').pop(); // Obtener solo el nombre del archivo
                window.open(`${urlServer}documentos/ver/${fileName}`, '_blank');
              }}
            >
              Ver documento
            </Button>
            <div className="documento-info">
              <div className="documento-date">
                <CalendarOutlined /> {moment(doc.fechaSubida).format('DD/MM/YYYY')}
              </div>
              {doc.fechaVencimiento && (
                <div className="documento-date">
                  <CalendarOutlined style={{ color: '#ff4d4f' }} /> Vence: {moment(doc.fechaVencimiento).format('DD/MM/YYYY')}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocumentosList;