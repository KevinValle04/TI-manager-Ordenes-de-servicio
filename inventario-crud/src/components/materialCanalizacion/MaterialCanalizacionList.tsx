import axios from "axios";
import { useEffect, useState } from "react";
import { Alert, Button, Col, Form, Modal, Row, Spinner } from "react-bootstrap";
import { MaterialCanalizacion } from "../../types";
import DataTable, { DataTableColumn } from "../common/DataTable";
import PaginationCompact from "../common/PaginationCompact";
import SearchBar from "../common/SearchBar";

const emptyMaterialCanalizacion: MaterialCanalizacion = { 
  tipo: "", 
  material: "", 
  medida: "", 
  unidad: "PZA", 
  proveedor: "", 
  precio: 0, 
  fechaActualizacion: new Date().toISOString()
};

const MaterialCanalizacionList: React.FC = () => {
  const [materialesCanalizacion, setMaterialesCanalizacion] = useState<MaterialCanalizacion[]>([]);
  const [filteredMateriales, setFilteredMateriales] = useState<MaterialCanalizacion[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newMaterial, setNewMaterial] = useState<MaterialCanalizacion>({ ...emptyMaterialCanalizacion });
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;
  const urlServer = import.meta.env.VITE_API_URL + "material-canalizacion/";

  const fetchMaterialesCanalizacion = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<MaterialCanalizacion[]>(urlServer);
      setMaterialesCanalizacion(res.data);
      setFilteredMateriales(res.data);
    } catch {
      setError("Error al cargar materiales de canalización");
      setMaterialesCanalizacion([]);
      setFilteredMateriales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterialesCanalizacion(); }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) {
      setFilteredMateriales(materialesCanalizacion);
      return;
    }
    const lower = term.toLowerCase();
    setFilteredMateriales(materialesCanalizacion.filter(m =>
      m.tipo.toLowerCase().includes(lower) ||
      m.material.toLowerCase().includes(lower) ||
      m.medida.toLowerCase().includes(lower) ||
      m.proveedor.toLowerCase().includes(lower)
    ));
  };

  const handleSave = async () => {
    try {
      const materialToSave = {
        ...newMaterial,
        fechaActualizacion: new Date().toISOString()
      };
      if (editId) {
        await axios.put(urlServer + editId, materialToSave);
      } else {
        await axios.post(urlServer, materialToSave);
      }
      handleCloseModal();
      fetchMaterialesCanalizacion();
    } catch {
      setError("No se pudo guardar el material de canalización");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar material de canalización?")) return;
    try {
      await axios.delete(urlServer + id);
      fetchMaterialesCanalizacion();
    } catch {
      setError("No se pudo eliminar el material de canalización");
    }
  };

  const handleEdit = (material: MaterialCanalizacion) => {
    setEditId(material._id || null);
    setNewMaterial({ ...material });
    setShowModal(true);
  };

  const handleOpenCreateModal = () => {
    setShowModal(true);
    setEditId(null);
    setNewMaterial({ ...emptyMaterialCanalizacion });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditId(null);
    setNewMaterial({ ...emptyMaterialCanalizacion });
  };

  const columns: DataTableColumn<MaterialCanalizacion>[] = [
    { key: "tipo", label: "Tipo" },
    { key: "material", label: "Material" },
    { key: "medida", label: "Medida" },
    { key: "unidad", label: "Unidad" },
    { key: "proveedor", label: "Proveedor" },
    { 
      key: "precio", 
      label: "Precio",
      render: (material) => `$${material.precio.toFixed(2)}`
    },
    { 
      key: "fechaActualizacion", 
      label: "Fecha Actualización",
      render: (material) => new Date(material.fechaActualizacion).toLocaleDateString("es-MX")
    },
  ];

  const totalPages = Math.ceil(filteredMateriales.length / itemsPerPage);
  const paginated = filteredMateriales.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por tipo, material, medida o proveedor..."
          className="flex-grow-1"
        />
        <Button variant="success" onClick={handleOpenCreateModal}>
          Agregar Material de Canalización
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status" />
          <p className="mt-2">Cargando materiales...</p>
        </div>
      ) : (
        <>
          <div className="table-responsive" style={{ 
            minHeight: `calc(100vh - 270px)`, 
            maxHeight: `calc(100vh - 270px)`, 
            overflowY: "auto", 
            background: "#fff", 
            borderRadius: 8, 
            boxShadow: "0 2px 8px rgba(0,0,0,0.03)" 
          }}>
            <DataTable
              columns={columns}
              data={paginated}
              actions={(material) => (
                <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => handleEdit(material)}
                    title="Editar"
                  >
                    <i className="fas fa-pencil-alt"></i>
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(material._id!)}
                    title="Eliminar"
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              )}
              className="small"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div className="d-flex justify-content-center my-3">
            <PaginationCompact currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        </>
      )}

      <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>{editId ? "Editar Material de Canalización" : "Agregar Material de Canalización"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Form>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label htmlFor="material-tipo">Tipo</Form.Label>
                <Form.Control
                  id="material-tipo"
                  aria-label="Tipo"
                  type="text"
                  placeholder="Ej. Tubo, Canaleta, Charola..."
                  value={newMaterial.tipo}
                  onChange={e => setNewMaterial({ ...newMaterial, tipo: e.target.value })}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label htmlFor="material-nombre">Material</Form.Label>
                <Form.Control
                  id="material-nombre"
                  aria-label="Material"
                  type="text"
                  placeholder="Ej. PVC, Galvanizado, Aluminio..."
                  value={newMaterial.material}
                  onChange={e => setNewMaterial({ ...newMaterial, material: e.target.value })}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label htmlFor="material-medida">Medida</Form.Label>
                <Form.Control
                  id="material-medida"
                  aria-label="Medida"
                  type="text"
                  placeholder="Ej. 1/2, 3/4, 1, 2..."
                  value={newMaterial.medida}
                  onChange={e => setNewMaterial({ ...newMaterial, medida: e.target.value })}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label htmlFor="material-unidad">Unidad</Form.Label>
                <Form.Select
                  id="material-unidad"
                  aria-label="Unidad"
                  value={newMaterial.unidad}
                  onChange={e => setNewMaterial({ ...newMaterial, unidad: e.target.value as "PZA" | "MTS" })}
                >
                  <option value="PZA">PZA</option>
                  <option value="MTS">MTS</option>
                </Form.Select>
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label htmlFor="material-proveedor">Proveedor</Form.Label>
                <Form.Control
                  id="material-proveedor"
                  aria-label="Proveedor"
                  type="text"
                  placeholder="Ej. CONDUIT, PLASTIMEX..."
                  value={newMaterial.proveedor}
                  onChange={e => setNewMaterial({ ...newMaterial, proveedor: e.target.value })}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label htmlFor="material-precio">Precio</Form.Label>
                <Form.Control
                  id="material-precio"
                  aria-label="Precio"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newMaterial.precio}
                  onChange={e => setNewMaterial({ ...newMaterial, precio: parseFloat(e.target.value) || 0 })}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Fecha Actualización</Form.Label>
                <Form.Control
                  aria-label="Fecha Actualización"
                  type="text"
                  value={new Date().toLocaleDateString("es-MX")}
                  disabled
                  className="bg-light"
                />
                <Form.Text className="text-muted">
                  Se actualiza automáticamente al guardar
                </Form.Text>
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

export default MaterialCanalizacionList;
