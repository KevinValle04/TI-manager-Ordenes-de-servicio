import { CalendarOutlined, DeleteOutlined, FileOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, message, Tooltip, Upload } from 'antd';
import axios from 'axios';
import moment from 'moment';
import React, { useState } from 'react';
import './DocumentosList.css';

// Asegura base URL con slash al final, igual que en ColaboradorList
const urlServer = import.meta.env.VITE_API_URL.endsWith('/') 
  ? import.meta.env.VITE_API_URL 
  : import.meta.env.VITE_API_URL + '/';

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
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Documento | null>(null);

  const handleAddOrEditDocument = async (values: { nombre: string; documento: any[]; fechaVencimiento?: moment.Moment }) => {
    try {
      setLoading(true);
      const formData = new FormData();
      if (values.documento && values.documento[0]) {
        const file = values.documento[0].originFileObj;
        formData.append('documento', file);
      }
      formData.append('nombre', values.nombre);
      formData.append('colaboradorId', colaboradorId);
      if (values.fechaVencimiento) {
        formData.append('fechaVencimiento', values.fechaVencimiento.toISOString());
      }

      if (editingDoc) {
        // PUT para editar
        await axios.put(
          `${urlServer}documentos/${editingDoc._id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        message.success('Documento editado correctamente');
      } else {
        // POST para agregar
        if (!values.documento || !values.documento[0]) throw new Error('No se seleccionó ningún archivo');
        await axios.post(
          `${urlServer}documentos`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        message.success('Documento agregado correctamente');
      }
      form.resetFields();
      setModalVisible(false);
      setEditingDoc(null);
      onDocumentosChange();
    } catch (error: any) {
      console.error('Error al guardar documento:', error);
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        if (error.response) {
          console.error('Respuesta del servidor:', error.response);
          if (error.response.status === 404) {
            message.error('La ruta del servidor no fue encontrada. Por favor, verifique la configuración.');
          } else {
            message.error(
              error.response.data?.error || 
              `Error del servidor: ${error.response.status} - ${error.response.statusText}`
            );
          }
        } else if (error.request) {
          console.error('No se recibió respuesta del servidor');
          message.error('No se pudo conectar con el servidor. Por favor, verifique su conexión.');
        } else {
          console.error('Error de configuración:', error.message);
          message.error('Error al configurar la solicitud: ' + error.message);
        }
      } else {
        console.error('Error no relacionado con la red:', error);
        message.error(error.message || 'Error desconocido al guardar el documento');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditDocument = (doc: Documento) => {
    setEditingDoc(doc);
    setModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        nombre: doc.nombre,
        fechaVencimiento: doc.fechaVencimiento ? moment(doc.fechaVencimiento) : null,
        documento: [] // No se puede prellenar el archivo
      });
    }, 0);
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
    <div className="documentos-container">
      <div className="documentos-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 16,
        borderBottom: '1px solid #f0f0f0',
        paddingBottom: 16
      }}>
        <h3 style={{ margin: 0 }}>Lista de Documentos</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(!modalVisible)}
        >
          {modalVisible ? 'Cancelar' : 'Agregar Documento'}
        </Button>
      </div>

      {modalVisible && (
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={editingDoc ? 'Editar Documento' : 'Nuevo Documento'}
        >
          <Form 
            form={form} 
            onFinish={handleAddOrEditDocument}
            layout="vertical"
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Form.Item
                name="nombre"
                label="Nombre del documento"
                rules={[{ required: true, message: 'Por favor ingrese un nombre' }]}
              >
                <Input placeholder="Ingrese el nombre del documento" />
              </Form.Item>

              <Form.Item
                name="fechaVencimiento"
                label="Fecha de vencimiento (opcional)"
                tooltip="La fecha debe ser igual o posterior a hoy"
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  placeholder="Seleccione una fecha"
                  format="DD/MM/YYYY"
                  disabledDate={(current) => {
                    return current && current < moment().startOf('day');
                  }}
                  showToday={true}
                  showTime={false}
                  inputReadOnly={true}
                  allowClear={true}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  onChange={(date) => {
                    if (date && date.isValid()) {
                      form.setFieldValue('fechaVencimiento', date);
                    } else {
                      form.setFieldValue('fechaVencimiento', null);
                    }
                  }}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="documento"
              label="Documento"
              valuePropName="fileList"
              getValueFromEvent={(e) => {
                if (Array.isArray(e)) {
                  return e;
                }
                return e?.fileList;
              }}
              rules={editingDoc ? [] : [{ required: true, message: 'Por favor selecciona un documento' }]}
            >
              <Upload.Dragger
                name="documento"
                beforeUpload={() => false}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                maxCount={1}
                listType="picture"
              >
                <div>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">Haga clic o arrastre un archivo a esta área</p>
                  <p className="ant-upload-hint">
                    Archivos permitidos: PDF, JPG, PNG, GIF, WEBP
                  </p>
                </div>
              </Upload.Dragger>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingDoc ? 'Guardar Cambios' : 'Guardar Documento'}
              </Button>
              {editingDoc && (
                <Button style={{ marginLeft: 8 }} onClick={() => { setEditingDoc(null); setModalVisible(false); form.resetFields(); }}>
                  Cancelar
                </Button>
              )}
            </Form.Item>
          </Form>
        </Card>
      )}

      <div className="documentos-grid">
        {documentos.map((doc) => (
          <Card
            key={doc._id}
            size="small"
            title={doc.nombre}
            className="documento-card"
            extra={
              <div className="documento-actions" style={{ display: 'flex', gap: 8 }}>
                <Tooltip title="Editar">
                  <Button
                    type="text"
                    icon={<FileOutlined />}
                    onClick={() => handleEditDocument(doc)}
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
                window.open(`${urlServer}documentos/ver/${doc.url}`, '_blank');
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
                  <CalendarOutlined style={{ color: '#ff4d4f' }} /> 
                  Vence: {moment(doc.fechaVencimiento).format('DD/MM/YYYY')}
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