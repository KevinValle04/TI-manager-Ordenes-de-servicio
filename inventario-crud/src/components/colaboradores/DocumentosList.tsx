import { CalendarOutlined, DeleteOutlined, FileOutlined, InboxOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, DatePicker, Form, Input, message, Tooltip, Upload } from 'antd';
import axios from 'axios';
import moment from 'moment';
import React, { useState } from 'react';
import './DocumentosList.css';

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

  const handleAddDocument = async (values: { nombre: string; archivo: any[]; fechaVencimiento?: moment.Moment }) => {
    try {
      setLoading(true);

      console.log('Valores del formulario:', values); // Para depuración

      // Validar el nombre
      if (!values.nombre || values.nombre.trim() === '') {
        throw new Error('Por favor ingrese un nombre para el documento');
      }

      // Validar el archivo
      if (!values.archivo) {
        throw new Error('Por favor seleccione un archivo');
      }

      if (!Array.isArray(values.archivo)) {
        console.error('Tipo de archivo inesperado:', typeof values.archivo);
        throw new Error('Formato de archivo no válido');
      }

      if (values.archivo.length === 0) {
        throw new Error('Por favor seleccione un archivo');
      }

      const fileInfo = values.archivo[0];
      if (!fileInfo) {
        throw new Error('No se pudo acceder al archivo');
      }

      const file = fileInfo.originFileObj;
      console.log('Información del archivo:', file); // Para depuración

      if (!file) {
        throw new Error('No se pudo acceder al archivo seleccionado');
      }

      if (!(file instanceof File)) {
        console.error('Tipo de archivo:', file.constructor.name);
        throw new Error('El archivo seleccionado no es válido');
      }

      // Validar el tamaño del archivo (máximo 10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB en bytes
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('El archivo es demasiado grande. El tamaño máximo permitido es 10MB');
      }

      // Validar el tipo de archivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Solo se permiten archivos PDF, JPG, PNG, GIF y WEBP');
      }

      // Crear el FormData
      const formData = new FormData();
      formData.append('nombre', values.nombre.trim());
      formData.append('documento', file);

      // Procesar la fecha de vencimiento
      if (values.fechaVencimiento && moment.isMoment(values.fechaVencimiento) && values.fechaVencimiento.isValid()) {
        const fecha = values.fechaVencimiento.clone().endOf('day');
        formData.append('fechaVencimiento', fecha.toISOString());
      }

      // Construir la URL directamente sin duplicar 'api'
      const baseUrl = urlServer.includes('/api/') ? urlServer.replace('/api/', '/') : urlServer;
      const url = `${baseUrl}documentos/colaborador/${colaboradorId}`;
      console.log('URL de la solicitud:', url); // Para depuración

      // Enviar la solicitud
      await axios.post(
        url,
        formData,
        { 
          headers: { 
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      message.success('Documento agregado correctamente');
      form.resetFields();
      setModalVisible(false);
      onDocumentosChange();
    } catch (error: any) {
      console.error('Error al agregar documento:', error);
      
      // Manejar diferentes tipos de errores
      if (error && typeof error === 'object' && 'isAxiosError' in error) {
        if (error.response) {
          // El servidor respondió con un estado de error
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
          // La solicitud se hizo pero no se recibió respuesta
          console.error('No se recibió respuesta del servidor');
          message.error('No se pudo conectar con el servidor. Por favor, verifique su conexión.');
        } else {
          // Error al configurar la solicitud
          console.error('Error de configuración:', error.message);
          message.error('Error al configurar la solicitud: ' + error.message);
        }
      } else {
        // Error que no es de Axios
        console.error('Error no relacionado con la red:', error);
        message.error(error.message || 'Error desconocido al agregar el documento');
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
          title="Nuevo Documento"
        >
          <Form 
            form={form} 
            onFinish={handleAddDocument}
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
              name="archivo"
              label="Archivo"
              rules={[{ required: true, message: 'Por favor seleccione un archivo' }]}
            >
              <Upload.Dragger
                name="archivo"
                multiple={false}
                beforeUpload={() => false}
                maxCount={1}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                style={{ padding: '10px 0' }}
                fileList={form.getFieldValue('archivo') || []}
                onChange={(info) => {
                  const { file, fileList } = info;
                  
                  if (file.status === 'removed') {
                    form.setFieldValue('archivo', undefined);
                  } else {
                    // Actualizar el valor del formulario con la lista de archivos
                    form.setFieldValue('archivo', fileList);
                  }
                }}
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
                Guardar Documento
              </Button>
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
              <div className="documento-actions">
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
                const fileName = doc.url.split('/').pop();
                if (!fileName) {
                  message.error('No se pudo determinar el nombre del archivo');
                  return;
                }
                const viewUrl = new URL('documentos/ver/' + fileName, urlServer);
                window.open(viewUrl.toString(), '_blank');
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