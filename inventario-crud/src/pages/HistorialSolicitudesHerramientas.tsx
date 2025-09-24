import React, { useEffect, useState } from "react";
import { Table, Tag } from "antd";
import { obtenerSolicitudes } from "../utils/solicitudesService";

interface Solicitud {
  _id: string;
  colaboradorNombre: string;
  recursoNombre: string;
  accion: string;
  estado: string;
  fecha?: string;
}

const HistorialSolicitudesHerramientas: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const res = await obtenerSolicitudes();
      // Filtrar solo aprobadas o rechazadas y ordenar por fecha descendente
      const solicitudesOrdenadas = (res.data as Solicitud[])
        .filter(s => s.estado === 'aprobada' || s.estado === 'rechazada')
        .sort((a, b) => {
          const fechaA = (a as any).fecha ? new Date((a as any).fecha).getTime() : 0;
          const fechaB = (b as any).fecha ? new Date((b as any).fecha).getTime() : 0;
          return fechaB - fechaA;
        });
      setSolicitudes(solicitudesOrdenadas);
    } catch (err) {
      // Puedes agregar un mensaje de error si lo deseas
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSolicitudes();
  }, []);

  const columns = [
    { title: "Colaborador", dataIndex: "colaboradorNombre", key: "colaboradorNombre" },
    { title: "Herramienta", dataIndex: "recursoNombre", key: "recursoNombre" },
    { title: "Acción", dataIndex: "accion", key: "accion" },
    { title: "Estado", dataIndex: "estado", key: "estado", render: (estado: string) => (
      <Tag color={estado === "aprobada" ? "green" : "red"}>{estado}</Tag>
    ) },
  ];

  return (
    <div>
      <h2>Historial de Solicitudes de Herramientas</h2>
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

export default HistorialSolicitudesHerramientas;
