import { jwtDecode } from 'jwt-decode';
// src/components/inventario/InventoryListExterior.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { IInventoryItem } from "../../types";
import { Button, Modal, Form, Table, Row, Col } from "react-bootstrap";
import SearchBar from "../common/SearchBar";
import DataTable, { DataTableColumn } from "../common/DataTable";
import ExportExcelButton from "../common/ExportExcelButton";
import PaginationCompact from "../common/PaginationCompact";
import ItemModal from "../common/ItemModal";
import BajaModal from "../common/BajaModal";
import AltaModal from "../common/AltaModal";

// Componente funcional para la página de inventario exterior
const InventoryListExterior: React.FC = () => {
  // Estado para los artículos del inventario
  const [items, setItems] = useState<IInventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<IInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [showAltaModal, setShowAltaModal] = useState(false);
  const [showMovModal, setShowMovModal] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<IInventoryItem>({
    descripcion: "",
    marca: "",
    modelo: "",
    proveedor: "",
    unidad: "PZA",
    precioUnitario: 0,
    cantidad: 0,
    numerosSerie: [],
    categorias: [],
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [movDesde, setMovDesde] = useState("");
  const [movHasta, setMovHasta] = useState("");
  const [movPage, setMovPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cambia SOLO las rutas a inventario-exterior y movimientos-exterior
  const urlServer = import.meta.env.VITE_API_URL + "inventario-exterior/";
  const urlMovimientos = import.meta.env.VITE_API_URL + "inventory-movements-exterior";

    function handleSearch(value: string): void {
        setSearchTerm(value);
        if (!value.trim()) {
            setFilteredItems(items);
            return;
        }
        const lowerValue = value.toLowerCase();
        setFilteredItems(
            items.filter(
                (item) =>
                    item.descripcion.toLowerCase().includes(lowerValue) ||
                    item.marca.toLowerCase().includes(lowerValue) ||
                    item.modelo.toLowerCase().includes(lowerValue) ||
                    (item.categorias &&
                        item.categorias.some((cat) =>
                            cat.toLowerCase().includes(lowerValue)
                        ))
            )
        );
        setCurrentPage(1);
    }

  // Función para obtener los artículos del backend
  const fetchItems = async () => {
    try {
      const res = await axios.get<IInventoryItem[]>(urlServer);
      setItems(res.data);
      setFilteredItems(res.data);
      return res.data;
    } catch (error) {
      console.error("Error al obtener inventario exterior:", error);
      return [];
    }
  };

  // Función para obtener los movimientos del backend
  const fetchMovimientos = async () => {
    try {
      const params: any = {};
      if (movDesde) params.desde = new Date(movDesde + "T00:00:00.000Z").toISOString();
      if (movHasta) params.hasta = new Date(movHasta + "T23:59:59.999Z").toISOString();
      const res = await axios.get(urlMovimientos, { params });
      setMovimientos(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setMovimientos([]);
    }
  };

  // Guardar (crear o editar) un artículo
  const handleSaveItem = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('token');
      if (editItemId) {
        const original = items.find(i => i._id === editItemId);
        const cantidadOriginal = original ? original.cantidad : 0;
        await axios.put(urlServer + editItemId, newItem);
        const cantidadEditada = newItem.cantidad - cantidadOriginal;
        if (cantidadEditada !== 0) {
          await axios.post(urlMovimientos, {
            itemId: editItemId,
            tipo: cantidadEditada > 0 ? "entrada" : "salida",
            cantidad: Math.abs(cantidadEditada),
            fecha: new Date(),
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } else {
        const res = await axios.post<IInventoryItem>(urlServer, { ...newItem });
        if (newItem.cantidad > 0 && res.data && res.data._id) {
          await axios.post(urlMovimientos, {
            itemId: res.data._id,
            tipo: "entrada",
            cantidad: newItem.cantidad,
            fecha: new Date(),
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      }
      setShowModal(false);
      resetModalState();
      fetchItems();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || "Error al guardar el item exterior");
    } finally {
      setIsSaving(false);
    }
  };

  // Restablece el estado del modal y limpia el formulario
  const resetModalState = () => {
    setNewItem({
      descripcion: "",
      marca: "",
      modelo: "",
      proveedor: "",
      unidad: "PZA",
      precioUnitario: 0,
      cantidad: 0,
      numerosSerie: [],
      categorias: [],
    });
    setEditItemId(null);
  };

  // Elimina un artículo por id
  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.");
    if (!confirmed) return;
    try {
      const token = localStorage.getItem('token');
      const item = items.find(i => i._id === id);
      if (item && item.cantidad > 0) {
        await axios.post(urlMovimientos, {
          itemId: id,
          tipo: "salida",
          cantidad: item.cantidad,
          fecha: new Date(),
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      await axios.delete(urlServer + id);
      const updatedItems = await fetchItems();
      if (searchTerm === "") {
        setFilteredItems(updatedItems);
      } else {
        const lowerTerm = searchTerm.toLowerCase();
        const filtered = updatedItems.filter(
          (item) =>
            item.descripcion.toLowerCase().includes(lowerTerm) ||
            item.marca.toLowerCase().includes(lowerTerm) ||
            item.modelo.toLowerCase().includes(lowerTerm) ||
            item.categorias.some((cat) => cat.toLowerCase().includes(lowerTerm)) ||
            item.numerosSerie.some((num) => num.toLowerCase().includes(lowerTerm))
        );
        setFilteredItems(filtered);
      }
    } catch (error) {
      console.error("Error al eliminar item exterior:", error);
    }
  };

  // Prepara el modal para editar un artículo
  const handleEditItem = (item: IInventoryItem) => {
    setEditItemId(item._id ?? null);
    setNewItem({ ...item });
    setShowModal(true);
  };

  // Lógica para enviar solicitud de baja
  const handleBaja = async (item: IInventoryItem, cantidad: number, comentario: string) => {
    try {
      // Verificar si hay token
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = '/login';
        return;
      }

      console.log('Token:', token); // Para debugging

      // Enviar solicitud de baja (no requiere autenticación)
      const response = await axios.post("/api/inventory-requests", {
        tipoMovimiento: "SALIDA",
        inventarioTipo: "EXTERIOR",
        itemId: item._id,
        cantidad,
        motivoSolicitud: comentario,
        numerosSerie: [] // Si necesitas incluir números de serie específicos, agrégalos aquí
      });
      
      if (response.data) {
        alert("Solicitud de baja enviada correctamente. Pendiente de aprobación por el administrador.");
      }
      
    } catch (error: any) {
      console.error("Error al enviar solicitud de baja:", error);
      console.error("Detalles del error:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        headers: error.response?.headers
      });
      
      // Manejar diferentes tipos de errores
      if (error.response?.status === 401) {
        localStorage.removeItem('token'); // Limpiar el token si es inválido
        alert("No tiene autorización para realizar esta acción. Por favor, inicie sesión nuevamente.");
        window.location.href = '/login';
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else if (error.code === 'ERR_NETWORK') {
        alert("Error de conexión con el servidor. Por favor, verifique su conexión e intente nuevamente.");
      } else {
        alert("Error al enviar la solicitud de baja. Por favor, intente nuevamente.");
      }
    }
  };

  // Lógica para alta desde escaneo o manual
  const handleAlta = async (item: IInventoryItem | null, sn: string, cantidad: number, comentario: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
      window.location.href = '/login';
      return;
    }

    try {
      if (item) {
        // Crear solicitud de alta para item existente
        const response = await axios.post("/api/inventory-requests", {
          tipoMovimiento: "ENTRADA",
          inventarioTipo: "EXTERIOR",
          itemId: item._id,
          cantidad,
          motivoSolicitud: comentario,
          numerosSerie: [sn]
        });

        if (response.data) {
          alert("Solicitud de alta enviada correctamente. Pendiente de aprobación por el administrador.");
        }
      } else {
        // Para items nuevos, primero mostrar el modal de creación
        setShowModal(true);
        setNewItem({
          descripcion: "",
          marca: "",
          modelo: "",
          proveedor: "",
          unidad: "PZA",
          precioUnitario: 0,
          cantidad: cantidad,
          numerosSerie: [sn],
          categorias: [],
        });
      }
    } catch (error: any) {
      console.error("Error al enviar solicitud de alta:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        alert("No tiene autorización para realizar esta acción. Por favor, inicie sesión nuevamente.");
        window.location.href = '/login';
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert("Error al procesar la solicitud. Por favor, intente nuevamente.");
      }
    }
  };

  // Definición de las columnas para la tabla reutilizable
  const columns: DataTableColumn<IInventoryItem>[] = [
    { key: "marca", label: "Marca" },
    { key: "modelo", label: "Modelo" },
    { key: "descripcion", label: "Descripción" },
    { key: "unidad", label: "Unidad" },
    { key: "precioUnitario", label: "Precio Unitario" },
    { key: "cantidad", label: "Cantidad" },
    { key: "numerosSerie", label: "Números de Serie", render: (item) => item.numerosSerie.join(", ") },
  ];

  // Cálculo de la paginación
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const movsPerPage = 8;
  const totalMovPages = Math.ceil(movimientos.length / movsPerPage);
  const paginatedMovs = movimientos.slice((movPage - 1) * movsPerPage, movPage * movsPerPage);

  // Cambia la página currentPage
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (showMovModal) {
      setMovimientos([]);
      setMovDesde("");
      setMovHasta("");
    }
  }, [showMovModal]);

  useEffect(() => {
    if (showMovModal) {
      const hoy = new Date();
      const diaSemana = hoy.getDay();
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
      const domingo = new Date(hoy);
      domingo.setDate(hoy.getDate() + (7 - diaSemana) % 7);
      const toYYYYMMDD = (d: Date) => d.toISOString().slice(0, 10);
      setMovDesde(toYYYYMMDD(lunes));
      setMovHasta(toYYYYMMDD(domingo));
      setTimeout(() => { fetchMovimientos(); }, 0);
    }
  }, [showMovModal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredItems.length]);

  useEffect(() => {
    setMovPage(1);
  }, [movimientos, movDesde, movHasta]);

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por descripción, marca, modelo o categoría..."
          className="flex-grow-1"
        />
        <div className="d-flex flex-row flex-wrap flex-md-nowrap gap-2 w-100 w-md-auto mt-2 mt-md-0">
          <Button
            variant="success"
            className="w-100 w-md-auto"
            onClick={() => setShowModal(true)}
          >
            Agregar Artículo
          </Button>
          <Button
            variant="info"
            className="w-100 w-md-auto"
            onClick={() => setShowBajaModal(true)}
          >
            Baja
          </Button>
          <Button
            variant="primary"
            className="w-100 w-md-auto"
            onClick={() => setShowAltaModal(true)}
          >
            Alta
          </Button>
          <Button
            variant="secondary"
            className="w-100 w-md-auto"
            onClick={() => setShowMovModal(true)}
          >
            Movimientos
          </Button>
          <ExportExcelButton
            data={items.map(({ _id, ...item }) => item)}
            fileName={`inventario_exterior_${new Date().toISOString().slice(0,10)}.xlsx`}
            sheetName="Inventario Exterior"
            className="w-100 w-md-auto"
          />
        </div>
      </div>
      <div
        className="table-responsive"
        style={{
          minHeight: `calc(100vh - 270px)`,
          maxHeight: `calc(100vh - 270px)`,
          overflowY: "auto",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
        }}
      >
        <DataTable
          columns={columns}
          data={paginatedItems}
          actions={(item) => {
            let isAdmin = false;
            try {
              const token = localStorage.getItem('token');
              if (token) {
                const decoded = jwtDecode(token);
                isAdmin = (decoded as any).isAdmin === true;
              }
            } catch {}
            if (!isAdmin) return null;
            return (
              <div className="d-flex flex-column flex-sm-row align-items-stretch gap-1">
                <Button
                  variant="warning"
                  size="sm"
                  className="w-100 w-sm-auto"
                  onClick={() => handleEditItem(item)}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="w-100 w-sm-auto"
                  onClick={() => handleDelete(item._id!)}
                >
                  Eliminar
                </Button>
              </div>
            );
          }}
          className="small"
          style={{ marginBottom: 0 }}
        />
      </div>
      <div className="d-flex justify-content-center my-3">
        <PaginationCompact
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
      <ItemModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          resetModalState();
          setErrorMessage(null);
        }}
        onSave={handleSaveItem}
        item={newItem}
        setItem={setNewItem}
        isEdit={!!editItemId}
        isSaving={isSaving}
        errorMessage={errorMessage ?? undefined}
      />
      <BajaModal
        show={showBajaModal}
        onHide={() => setShowBajaModal(false)}
        onBaja={handleBaja}
        items={items}
      />
      <AltaModal
        show={showAltaModal}
        onHide={() => setShowAltaModal(false)}
        onAlta={handleAlta}
        items={items}
      />
      <Modal show={showMovModal} onHide={() => setShowMovModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Movimientos de Inventario Exterior</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row className="mb-3">
            <Col md={5}>
              <Form.Label>Desde</Form.Label>
              <Form.Control type="date" value={movDesde} onChange={e => setMovDesde(e.target.value)} />
            </Col>
            <Col md={5}>
              <Form.Label>Hasta</Form.Label>
              <Form.Control type="date" value={movHasta} onChange={e => setMovHasta(e.target.value)} />
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="primary" className="w-100" onClick={fetchMovimientos}>Buscar</Button>
            </Col>
          </Row>
          <div className="mb-2 d-flex justify-content-end">
            <ExportExcelButton
              data={movimientos.map(mov => {
                const item = mov.itemId || {};
                return {
                  Fecha: mov.fecha ? new Date(mov.fecha).toLocaleString() : "-",
                  Tipo: mov.tipo === "entrada" ? "Entrada" : mov.tipo === "salida" ? "Salida" : "-",
                  Cantidad: typeof mov.cantidad === "number" ? mov.cantidad : "-",
                  Producto: item.descripcion || "-",
                  Marca: item.marca || "-",
                  Modelo: item.modelo || "-"
                };
              })}
              fileName={`movimientos_exterior_${movDesde || ""}_${movHasta || ""}.xlsx`}
              sheetName="Movimientos Exterior"
              className="mb-2"
            />
          </div>
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Producto</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Comentario</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovs.length === 0 && (
                <tr><td colSpan={8} className="text-center">Sin movimientos</td></tr>
              )}
              {paginatedMovs.map((mov, idx) => {
                const item = mov.itemId || {};
                return (
                  <tr key={idx}>
                    <td>{mov.fecha ? new Date(mov.fecha).toLocaleString() : "-"}</td>
                    <td>{mov.tipo === "entrada" ? "Entrada" : mov.tipo === "salida" ? "Salida" : "-"}</td>
                    <td>{typeof mov.cantidad === "number" ? mov.cantidad : "-"}</td>
                    <td>{item.descripcion || "-"}</td>
                    <td>{item.marca || "-"}</td>
                    <td>{item.modelo || "-"}</td>
                    <td>{mov.comentario || "-"}</td>
                    <td>{mov.usuario || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {totalMovPages > 1 && (
            <div className="d-flex justify-content-center my-2">
              <PaginationCompact
                currentPage={movPage}
                totalPages={totalMovPages}
                onPageChange={setMovPage}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMovModal(false)}>Cerrar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default InventoryListExterior;
