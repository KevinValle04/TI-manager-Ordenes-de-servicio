import axios from "axios";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { Alert, Button, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { Vendedor } from "../../types";
import DataTable, { DataTableColumn } from "../common/DataTable";
import PaginationCompact from "../common/PaginationCompact";
import SearchBar from "../common/SearchBar";

const emptyVendedor: Vendedor = { nombre: "", correo: "", telefono: "" };

const VendedorList: React.FC = () => {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [filteredVendedores, setFilteredVendedores] = useState<Vendedor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newVendedor, setNewVendedor] = useState<Vendedor>({ ...emptyVendedor });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;
  const urlServer = import.meta.env.VITE_API_URL + "vendedores/";

  const fetchVendedores = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<Vendedor[]>(urlServer);
      setVendedores(res.data);
      setFilteredVendedores(res.data);
    } catch (err) {
      setError("Error al cargar vendedores");
      setVendedores([]);
      setFilteredVendedores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendedores(); }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredVendedores(vendedores);
      return;
    }
    const lower = term.toLowerCase();
    setFilteredVendedores(
      vendedores.filter(v =>
        v.nombre.toLowerCase().includes(lower) ||
        v.correo.toLowerCase().includes(lower) ||
        v.telefono.toLowerCase().includes(lower)
      )
    );
  };

  const handleSave = async () => {
    // Validación: nombre, correo y teléfono obligatorios
    if (!newVendedor.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (!newVendedor.correo.trim()) {
      toast.error("El correo es obligatorio");
      return;
    }
    if (!newVendedor.telefono.trim()) {
      toast.error("El teléfono es obligatorio");
      return;
    }
    try {
      if (editId) {
        await axios.put(urlServer + editId, newVendedor);
      } else {
        await axios.post(urlServer, newVendedor);
      }
      handleCloseModal();
      fetchVendedores();
    } catch {
      setError("No se pudo guardar el vendedor");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar vendedor?")) return;
    try {
      await axios.delete(urlServer + id);
      fetchVendedores();
    } catch {
      setError("No se pudo eliminar el vendedor");
    }
  };

  const handleEdit = (vendedor: Vendedor) => {
    setEditId(vendedor._id || null);
    setNewVendedor({ ...vendedor });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
    setNewVendedor({ ...emptyVendedor });
  };

  const columns: DataTableColumn<Vendedor>[] = [
    { key: "nombre", label: "Nombre" },
    { key: "correo", label: "Correo" },
    { key: "telefono", label: "Teléfono" },
  ];

  const totalPages = Math.ceil(filteredVendedores.length / itemsPerPage);
  const paginated = filteredVendedores.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por nombre, correo o teléfono..."
          className="flex-grow-1"
        />
        <Button
          variant="success"
          onClick={() => { setShowModal(true); setEditId(null); setNewVendedor({ ...emptyVendedor }); }}
        >
          Agregar Vendedor
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Cargando vendedores...</p>
        </div>
      ) : (
        <>
          <div
            className="table-responsive"
            style={{
              minHeight: `calc(100vh - 270px)`,
              maxHeight: `calc(100vh - 270px)`,
              overflowY: "auto",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
            }}
          >
            <DataTable
              columns={columns}
              data={paginated}
              actions={(vendedor) => (
                <div className="d-flex flex-column flex-sm-row align-items-stretch gap-1">
                  <Button
                    variant="warning"
                    size="sm"
                    className="w-100 w-sm-auto"
                    onClick={() => handleEdit(vendedor)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-100 w-sm-auto"
                    onClick={() => handleDelete(vendedor._id!)}
                  >
                    Eliminar
                  </Button>
                </div>
              )}
              className="small"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div className="d-flex justify-content-center my-3">
            <PaginationCompact
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </>
      )}

      {/* MODAL */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>{editId ? "Editar Vendedor" : "Agregar Vendedor"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Form>
            <Row>
              <Col md={4} className="mb-3">
                <Form.Label htmlFor="vendedor-nombre">Nombre</Form.Label>
                <Form.Control
                  id="vendedor-nombre"
                  aria-label="Nombre"
                  type="text"
                  placeholder="Nombre del vendedor"
                  value={newVendedor.nombre}
                  onChange={e => setNewVendedor({ ...newVendedor, nombre: e.target.value })}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label htmlFor="vendedor-correo">Correo</Form.Label>
                <Form.Control
                  id="vendedor-correo"
                  aria-label="Correo"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newVendedor.correo}
                  onChange={e => setNewVendedor({ ...newVendedor, correo: e.target.value })}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label htmlFor="vendedor-telefono">Teléfono</Form.Label>
                <Form.Control
                  id="vendedor-telefono"
                  aria-label="Teléfono"
                  type="text"
                  placeholder="Ej: 5551234567"
                  value={newVendedor.telefono}
                  onChange={e => setNewVendedor({ ...newVendedor, telefono: e.target.value })}
                />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSave}>Guardar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default VendedorList;
