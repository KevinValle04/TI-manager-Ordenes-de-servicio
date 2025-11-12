import axios from "axios";
import { useEffect, useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { OrdenCompra, Proyecto } from "../../types";
import DataTable, { DataTableColumn } from "../common/DataTable";
import PaginationCompact from "../common/PaginationCompact";
import SearchBar from "../common/SearchBar";
import OrdenCompraForm from "./OrdenCompraForm";

const OrdenCompraList: React.FC = () => {
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState<OrdenCompra[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);

  const itemsPerPage = 10;
  const urlServer = import.meta.env.VITE_API_URL;

  // Cargar órdenes de compra
  const fetchOrdenes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${urlServer}ordenes-compra/`);
      const ordenes = response.data as OrdenCompra[];
      setOrdenesCompra(ordenes);
      setFilteredOrdenes(ordenes);
    } catch {
      setError("Error al cargar las órdenes de compra");
      setOrdenesCompra([]);
      setFilteredOrdenes([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar proyectos
  const fetchProyectos = async () => {
    try {
      const response = await axios.get(`${urlServer}proyectos/`);
      setProyectos(response.data);
    } catch (error) {
      console.error("Error al cargar proyectos:", error);
    }
  };

  useEffect(() => { 
    fetchOrdenes();
    fetchProyectos();
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (!value) return setFilteredOrdenes(ordenesCompra);

    const lower = value.toLowerCase();
    setFilteredOrdenes(
      ordenesCompra.filter(orden => {
        const numeroOrden = orden.numeroOrden?.toLowerCase() || '';
        const numeroCotizacion = orden.numeroCotizacion?.toLowerCase() || '';
        const proveedor = typeof orden.proveedor === "object" && orden.proveedor ? 
          orden.proveedor.empresa?.toLowerCase() || '' : 
          String(orden.proveedor || '').toLowerCase();
        const razonSocial = typeof orden.razonSocial === "object" && orden.razonSocial ? 
          orden.razonSocial.nombre?.toLowerCase() || '' : 
          String(orden.razonSocial || '').toLowerCase();

        return numeroOrden.includes(lower) ||
          numeroCotizacion.includes(lower) ||
          proveedor.includes(lower) ||
          razonSocial.includes(lower);
      })
    );
  };

  const handleNew = () => {
    setEditId(null);
    setShowModal(true);
  };

  const handleEdit = (orden: OrdenCompra) => {
    setEditId(orden._id || null);
    setShowModal(true);
  };

  const handleDelete = async (orden: OrdenCompra) => {
    if (!window.confirm(`¿Está seguro de eliminar la orden #${orden.numeroOrden}?`)) return;
    try {
      await axios.delete(`${urlServer}ordenes-compra/${orden._id}`);
      await fetchOrdenes();
    } catch {
      setError("Error al eliminar la orden de compra");
    }
  };

  const handleCloseForm = () => {
    setShowModal(false);
    setEditId(null);
  };

  const handleSaveForm = async (orden: OrdenCompra) => {
    try {
      if (editId) {
        await axios.put(`${urlServer}ordenes-compra/${editId}`, orden);
      } else {
        await axios.post(`${urlServer}ordenes-compra/`, orden);
      }
      setShowModal(false);
      setEditId(null);
      await fetchOrdenes();
    } catch {
      setError("Error al guardar la orden de compra");
    }
  };

  const handleVerPdf = (orden: OrdenCompra) => {
    if (!orden._id) return alert("ID de orden no válido");
    if (!orden.rutaPdf) return alert("No se ha generado PDF para esta orden de compra");
    window.open(`${urlServer}ordenes-compra/${orden._id}/pdf`, "_blank");
  };

  const handleDescargarPdf = (orden: OrdenCompra) => {
    if (!orden._id) return alert("ID de orden no válido");
    if (!orden.rutaPdf) return alert("No se ha generado PDF para esta orden de compra");
    window.open(`${urlServer}ordenes-compra/${orden._id}/pdf/descargar`, "_blank");
  };

  // Columnas de tabla
  const columns: DataTableColumn<OrdenCompra>[] = [
    { key: "numeroOrden", label: "Número de Orden" },
    { key: "numeroCotizacion", label: "Número de Cotización", render: o => o.numeroCotizacion || "N/A" },
    { key: "fecha", label: "Fecha", render: o => new Date(o.fecha).toLocaleDateString() },
    { 
      key: "proveedor", 
      label: "Proveedor", 
      render: o => {
        if (!o.proveedor) return "N/A";
        return typeof o.proveedor === "object" && o.proveedor !== null ? o.proveedor.empresa : o.proveedor.toString();
      }
    },
    { 
      key: "razonSocial", 
      label: "Razón Social", 
      render: o => {
        if (!o.razonSocial) return "N/A";
        return typeof o.razonSocial === "object" && o.razonSocial !== null ? o.razonSocial.nombre : o.razonSocial.toString();
      }
    },
  ];

  // Paginación
  const totalPages = Math.ceil(filteredOrdenes.length / itemsPerPage);
  const paginatedOrdenes = filteredOrdenes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      {/* Barra de búsqueda y botón nuevo */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por número de orden, cotización, proveedor o razón social..."
          className="flex-grow-1"
        />
        <Button variant="success" id="nueva-orden" aria-label="Nueva Orden de Compra" onClick={handleNew}>
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Mensajes de carga y error */}
      {loading && (
        <div className="text-center py-4">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Cargando órdenes de compra...</p>
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Tabla */}
      {!loading && !error && (
        <>
          <div className="table-responsive" style={{ minHeight: `calc(100vh - 270px)`, maxHeight: `calc(100vh - 270px)`, overflowY: "auto", background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
            <DataTable
              data={paginatedOrdenes}
              columns={columns}
              actions={(orden) => (
                <div className="d-flex flex-column flex-sm-row align-items-stretch gap-1">
                  <Button variant="warning" size="sm" onClick={() => handleEdit(orden)} aria-label={`Editar orden ${orden.numeroOrden}`}>Editar</Button>
                  {orden.rutaPdf && (
                    <>
                      <Button variant="info" size="sm" onClick={() => handleVerPdf(orden)} aria-label={`Ver PDF orden ${orden.numeroOrden}`}>Ver PDF</Button>
                      <Button variant="secondary" size="sm" onClick={() => handleDescargarPdf(orden)} aria-label={`Descargar PDF orden ${orden.numeroOrden}`}>📄</Button>
                    </>
                  )}
                  <Button variant="danger" size="sm" onClick={() => handleDelete(orden)} aria-label={`Eliminar orden ${orden.numeroOrden}`}>Eliminar</Button>
                </div>
              )}
              className="small"
            />
          </div>

          {/* Paginación */}
          <div className="d-flex justify-content-center my-3">
            <PaginationCompact currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </>
      )}

      {/* Modal Form */}
      <OrdenCompraForm
        proyectos={proyectos}
        show={showModal}
        onHide={handleCloseForm}
        onSave={handleSaveForm}
        editId={editId}
        onOrdenCreada={fetchOrdenes}
      />
    </div>
  );
};

export default OrdenCompraList;
