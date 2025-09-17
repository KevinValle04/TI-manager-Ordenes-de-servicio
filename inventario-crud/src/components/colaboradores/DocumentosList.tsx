import React, { useState, useEffect } from 'react';
import { Card, Button, Form, DatePicker, message, Upload, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, FileOutlined, EditOutlined } from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

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

  const handleAddDocument = async (values: any) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('nombre', values.nombre);
      formData.append('archivo', values.archivo[0].originFileObj);
      if (values.fechaVencimiento) {
        formData.append('fechaVencimiento', values.fechaVencimiento.toISOString());
      }

      await axios.post(
        `http://localhost:6051/api/documentos/${colaboradorId}`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      message.success('Documento agregado correctamente');
      form.resetFields();
      setModalVisible(false);
      onDocumentosChange();
    } catch (error) {
      console.error('Error al agregar documento:', error);
      message.error('Error al agregar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentoId: string) => {
    try {
      await axios.delete(`http://localhost:6051/api/documentos/${documentoId}`);
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {documentos.map((doc) => (
          <Card
            key={doc._id}
            size="small"
            title={doc.nombre}
            extra={
              <div style={{ display: 'flex', gap: '8px' }}>
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
            <p>
              <Button
                type="link"
                icon={<FileOutlined />}
                onClick={() => window.open(`http://localhost:6051/api/documentos/ver/${doc._id}`, '_blank')}
              >
                Ver documento
              </Button>
            </p>
            <p>Fecha: {moment(doc.fechaSubida).format('DD/MM/YYYY')}</p>
            {doc.fechaVencimiento && (
              <p>Vence: {moment(doc.fechaVencimiento).format('DD/MM/YYYY')}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DocumentosList;