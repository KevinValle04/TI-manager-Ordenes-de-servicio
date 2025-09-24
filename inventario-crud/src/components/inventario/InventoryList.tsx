// Componente principal de la lista de inventario
import { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';

import axios from "../../utils/axios-config";
import { IInventoryItem } from "../../types";
import { Button, Modal, Form, Table, Row, Col } from "react-bootstrap";
import SearchBar from "../common/SearchBar";
import DataTable, { DataTableColumn } from "../common/DataTable";
import ExportExcelButton from "../common/ExportExcelButton";
import PaginationCompact from "../common/PaginationCompact";
import ItemModal from "../common/ItemModal";
import BajaModal from "../common/BajaModal";
import AltaModal from "../common/AltaModal";

// Componente funcional para la página de inventario
const Inventario: React.FC = () => {
  // Estado para los artículos del inventario
  const [items, setItems] = useState<IInventoryItem[]>([]);
  // Estado para los artículos filtrados (por búsqueda)
  const [filteredItems, setFilteredItems] = useState<IInventoryItem[]>([]);
  // Estado para el término de búsqueda
  const [searchTerm, setSearchTerm] = useState("");
  // Estado para mostrar/ocultar el modal de agregar/editar
  const [showModal, setShowModal] = useState(false);
  // Estado para mostrar/ocultar el modal de baja
  const [showBajaModal, setShowBajaModal] = useState(false);
  // Estado para mostrar/ocultar el modal de alta
  const [showAltaModal, setShowAltaModal] = useState(false);
  // Estado para mostrar/ocultar el modal de movimientos
  const [showMovModal, setShowMovModal] = useState(false);
  // Estado para el id del artículo en edición
  const [editItemId, setEditItemId] = useState<string | null>(null);
  // Estado para el artículo nuevo o en edición
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
  // Estado para la página actual de la paginación
  const [currentPage, setCurrentPage] = useState(1);
  // Cantidad de artículos por página
  const itemsPerPage = 10;
  // Estado para los movimientos consultados
  const [movimientos, setMovimientos] = useState<any[]>([]);
  // Estado para el filtro de fechas
  const [movDesde, setMovDesde] = useState("");
  const [movHasta, setMovHasta] = useState("");
  // Estado para la paginación de movimientos
  const [movPage, setMovPage] = useState(1);
  // Estado para el guardado de artículos
  const [isSaving, setIsSaving] = useState(false);
  // Estado para mensajes de error
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const urlServer = import.meta.env.VITE_API_URL + "inventario/";
  const urlMovimientos = import.meta.env.VITE_API_URL + "inventory-movements";

  // Función para obtener los artículos del backend
  const fetchItems = async () => {
    try {
      const res = await axios.get<IInventoryItem[]>(urlServer);
      setItems(res.data);
      setFilteredItems(res.data);
      return res.data; // <-- retorna los datos
    } catch (error) {
      console.error("Error al obtener inventario:", error);
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
      if (editItemId) {
        // Obtener el item original antes de editar
        const original = items.find(i => i._id === editItemId);
        const cantidadOriginal = original ? original.cantidad : 0;
        await axios.put(urlServer + editItemId, newItem);
        // Registrar movimiento si la cantidad cambió
        const cantidadEditada = newItem.cantidad - cantidadOriginal;
        if (cantidadEditada !== 0) {
          const token = localStorage.getItem('token');
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
        // Crear nuevo artículo
        const res = await axios.post<IInventoryItem>(urlServer, { ...newItem });
        // Registrar movimiento de entrada si la cantidad es mayor a 0
        if (newItem.cantidad > 0 && res.data && res.data._id) {
          const token = localStorage.getItem('token');
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
      setErrorMessage(error?.response?.data?.message || "Error al guardar el item");
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
    // Confirmación antes de eliminar
    const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este artículo? Esta acción no se puede deshacer.");
    if (!confirmed) return;
    try {
      // Obtener el item antes de eliminar para registrar el movimiento
      const item = items.find(i => i._id === id);
      const token = localStorage.getItem('token');
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
      // Registrar movimiento de salida por la cantidad total eliminada

      const updatedItems = await fetchItems();
      // Aplica el filtro con los datos nuevos
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
      console.error("Error al eliminar item:", error);
    }
  };

  // Prepara el modal para editar un artículo
  const handleEditItem = (item: IInventoryItem) => {
    setEditItemId(item._id ?? null);
    setNewItem({ ...item });
    setShowModal(true);
  };

  // Lógica para realizar la baja
  const handleBaja = async (item: IInventoryItem, cantidad: number, comentario: string) => {
    try {
      // Verificar si hay token
      const token = localStorage.getItem('token');
      if (!token) {
        alert("Sesión expirada. Por favor, inicie sesión nuevamente.");
        window.location.href = '/login';
        return;
      }

      // Enviar solicitud de baja
      const response = await axios.post(`${urlServer}../inventory-requests`, {
        tipoMovimiento: "SALIDA",
        inventarioTipo: "INTERIOR",
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
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        alert("No tiene autorización para realizar esta acción. Por favor, inicie sesión nuevamente.");
        window.location.href = '/login';
      } else if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
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
        const response = await axios.post(`${urlServer}../inventory-requests`, {
          tipoMovimiento: "ENTRADA",
          inventarioTipo: "INTERIOR",
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

  // Filtra los artículos según el término de búsqueda
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term === "") {
      setFilteredItems(items);
    } else {
      const lowerTerm = term.toLowerCase();
      const filtered = items.filter(
        (item) =>
          item.descripcion.toLowerCase().includes(lowerTerm) ||
          item.marca.toLowerCase().includes(lowerTerm) ||
          item.modelo.toLowerCase().includes(lowerTerm) ||
          item.categorias.some((cat) => cat.toLowerCase().includes(lowerTerm)) ||
          item.numerosSerie.some((num) => num.toLowerCase().includes(lowerTerm))
      );
      setFilteredItems(filtered);
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

  // Carga los artículos al montar el componente
  useEffect(() => {
    fetchItems();
  }, []);

  // Limpia filtros y movimientos al abrir el modal de movimientos
  useEffect(() => {
    if (showMovModal) {
      setMovimientos([]);
      setMovDesde("");
      setMovHasta("");
    }
  }, [showMovModal]);

  // Al abrir el modal de movimientos, poner por defecto la semana en curso y mostrar movimientos
  useEffect(() => {
    if (showMovModal) {
      // Calcular lunes y domingo de la semana actual
      const hoy = new Date();
      const diaSemana = hoy.getDay(); // 0=domingo, 1=lunes, ...
      const lunes = new Date(hoy);
      lunes.setDate(hoy.getDate() - ((diaSemana + 6) % 7));
      const domingo = new Date(hoy);
      domingo.setDate(hoy.getDate() + (7 - diaSemana) % 7);
      // Formato yyyy-mm-dd
      const toYYYYMMDD = (d: Date) => d.toISOString().slice(0, 10);
      setMovDesde(toYYYYMMDD(lunes));
      setMovHasta(toYYYYMMDD(domingo));
      // Consultar movimientos de la semana
      setTimeout(() => { fetchMovimientos(); }, 0);
    }
  }, [showMovModal]);

  // Reinicia la página al cambiar el filtro/búsqueda
  useEffect(() => {
    setCurrentPage(1); // Reset page when filter/search changes
  }, [filteredItems.length]);

  // Reset paginación de movimientos al buscar o cambiar movimientos
  useEffect(() => {
    setMovPage(1);
  }, [movimientos, movDesde, movHasta]);

  // Renderizado del componente
  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      {/* Barra de búsqueda y botones de acción */}
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
            fileName={`inventario_${new Date().toISOString().slice(0,10)}.xlsx`}
            sheetName="Inventario"
            className="w-100 w-md-auto"
          />
        </div>
      </div>

      {/* Tabla de inventario */}
      <div
        className="table-responsive"
        style={{
          minHeight: `calc(100vh - 270px)`, // Ajusta el 270px según el header, searchbar y paddings
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

      {/* Paginación compacta */}
      <div className="d-flex justify-content-center my-3">
        <PaginationCompact
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Modal para agregar/editar artículo */}
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

      {/* Modal para dar de baja artículos */}
      <BajaModal
        show={showBajaModal}
        onHide={() => setShowBajaModal(false)}
        onBaja={handleBaja}
        items={items}
      />

      {/* Modal para dar de alta artículos */}
      <AltaModal
        show={showAltaModal}
        onHide={() => setShowAltaModal(false)}
        onAlta={handleAlta}
        items={items}
      />

      {/* Modal para movimientos */}
      <Modal show={showMovModal} onHide={() => setShowMovModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Movimientos de Inventario</Modal.Title>
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
              fileName={`movimientos_${movDesde || ""}_${movHasta || ""}.xlsx`}
              sheetName="Movimientos"
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

export default Inventario;
