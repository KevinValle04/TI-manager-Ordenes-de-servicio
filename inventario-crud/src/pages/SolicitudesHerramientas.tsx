// src/pages/SolicitudesHerramientas.tsx
import React, { useEffect, useState } from "react";
import { Modal, Descriptions } from "antd";
import { Tabs } from "antd";
import HistorialSolicitudesHerramientas from "./HistorialSolicitudesHerramientas";

interface Solicitud {
  _id: string;
  colaboradorNombre: string;
  recursoNombre: string;
  accion: string;
  estado: string;
  // agrega otros campos si es necesario
}
import { Table, Button, message, Tag } from "antd";
import { obtenerSolicitudes, actualizarSolicitud } from "../utils/solicitudesService";


const SolicitudesHerramientas: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [detalleVisible, setDetalleVisible] = useState(false);
  const [detalleSolicitud, setDetalleSolicitud] = useState<any>(null);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const res = await obtenerSolicitudes();
      // Filtrar solo pendientes y ordenar por fecha descendente
      const solicitudesOrdenadas = (res.data as Solicitud[])
        .filter(s => s.estado === 'pendiente')
        .sort((a, b) => {
          const fechaA = (a as any).fecha ? new Date((a as any).fecha).getTime() : 0;
          const fechaB = (b as any).fecha ? new Date((b as any).fecha).getTime() : 0;
          return fechaB - fechaA;
        });
      setSolicitudes(solicitudesOrdenadas);
    } catch (err) {
      message.error("Error al cargar solicitudes");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const handleAccion = async (id: string, accion: "aprobada" | "rechazada") => {
    try {
      await actualizarSolicitud(id, { estado: accion });
      message.success(`Solicitud ${accion}`);
      fetchSolicitudes();
    } catch {
      message.error("No se pudo actualizar la solicitud");
    }
  };

  const columns = [
    { title: "Colaborador", dataIndex: "colaboradorNombre", key: "colaboradorNombre" },
    { title: "Herramienta", dataIndex: "recursoNombre", key: "recursoNombre" },
    { title: "Acción", dataIndex: "accion", key: "accion" },
    { title: "Estado", dataIndex: "estado", key: "estado", render: (estado: string) => (
      <Tag color={estado === "pendiente" ? "orange" : estado === "aprobada" ? "green" : "red"}>{estado}</Tag>
    ) },
    {
      title: "Detalles",
      key: "detalles",
      render: (_: any, record: any) => record.accion === "Modificar" && (
        <Button size="small" onClick={() => { setDetalleSolicitud(record); setDetalleVisible(true); }}>Ver Detalles</Button>
      )
    },
    {
      title: "Opciones",
      key: "opciones",
      render: (_: any, record: any) => record.estado === "pendiente" && (
        <>
          <Button type="primary" size="small" onClick={() => handleAccion(record._id, "aprobada")}>Aprobar</Button>
          <Button type="default" size="small" danger style={{ marginLeft: 8 }} onClick={() => handleAccion(record._id, "rechazada")}>Rechazar</Button>
        </>
      )
    }
  ];

  return (
    <div>
      <Tabs defaultActiveKey="pendientes" items={[{
        key: 'pendientes',
        label: 'Solicitudes Pendientes',
        children: (
          <>
            <h2>Solicitudes de Herramientas</h2>
            <Table
              dataSource={solicitudes}
              columns={columns}
              rowKey="_id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
            <Modal
              open={detalleVisible}
              onCancel={() => setDetalleVisible(false)}
              footer={null}
              title="Detalles de Modificación"
              width={800}
            >
              {detalleSolicitud && detalleSolicitud.accion === 'Modificar' && detalleSolicitud.detalles ? (
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ textAlign: 'center' }}>Original</h4>
                    <Descriptions column={1} bordered size="small">
                      {Object.entries(detalleSolicitud.detallesOriginal || {}).length > 0 ? (
                        Object.entries(detalleSolicitud.detallesOriginal).map(([key, value]) => (
                          <Descriptions.Item label={key} key={key}>{String(value)}</Descriptions.Item>
                        ))
                      ) : (
                        <Descriptions.Item label="info">No disponible</Descriptions.Item>
                      )}
                    </Descriptions>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ textAlign: 'center' }}>Propuesta</h4>
                    <Descriptions column={1} bordered size="small">
                      {Object.entries(detalleSolicitud.detalles).map(([key, value]) => (
                        <Descriptions.Item label={key} key={key}>{String(value)}</Descriptions.Item>
                      ))}
                    </Descriptions>
                  </div>
                </div>
              ) : detalleSolicitud && detalleSolicitud.detalles ? (
                <Descriptions column={1} bordered size="small">
                  {Object.entries(detalleSolicitud.detalles).map(([key, value]) => (
                    <Descriptions.Item label={key} key={key}>{String(value)}</Descriptions.Item>
                  ))}
                </Descriptions>
              ) : (
                <div>No hay detalles para mostrar.</div>
              )}
            </Modal>
          </>
        )
      }, {
        key: 'historial',
        label: 'Historial de Solicitudes',
        children: <HistorialSolicitudesHerramientas />
      }]} />
    </div>
  );
};

export default SolicitudesHerramientas;