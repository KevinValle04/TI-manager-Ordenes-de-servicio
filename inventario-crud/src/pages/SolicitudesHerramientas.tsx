// src/pages/SolicitudesHerramientas.tsx
import React, { useEffect, useState } from "react";

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

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const res = await obtenerSolicitudes();
  setSolicitudes(res.data as Solicitud[]);
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
      <h2>Solicitudes de Herramientas</h2>
      <Table
        dataSource={solicitudes}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default SolicitudesHerramientas;