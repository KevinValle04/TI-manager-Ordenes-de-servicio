import axios from "axios";
import { useEffect, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import { IContactoProveedor, Proveedor } from "../../types";
import DataTable, { DataTableColumn } from "../common/DataTable";
import PaginationCompact from "../common/PaginationCompact";
import SearchBar from "../common/SearchBar";

const emptyContacto: IContactoProveedor = { nombre: "", puesto: "", correo: "", telefono: "", extension: "" };
const emptyProveedor: Proveedor = { empresa: "", direccion: "", telefono: "", contactos: [{ ...emptyContacto }] };

const ProveedorList: React.FC = () => {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filteredProveedores, setFilteredProveedores] = useState<Proveedor[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newProveedor, setNewProveedor] = useState<Proveedor>({ ...emptyProveedor });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const urlServer = import.meta.env.VITE_API_URL + "proveedores/";

  const fetchProveedores = async () => {
    try {
      const res = await axios.get<Proveedor[]>(urlServer);
      setProveedores(res.data);
      setFilteredProveedores(res.data);
    } catch (err) {
      setProveedores([]);
      setFilteredProveedores([]);
    }
  };

  useEffect(() => {
    fetchProveedores();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) setFilteredProveedores(proveedores);
    else {
      const lower = term.toLowerCase();
      setFilteredProveedores(
        proveedores.filter(
          (p) =>
            p.empresa.toLowerCase().includes(lower) ||
            p.direccion.toLowerCase().includes(lower) ||
            p.telefono.toLowerCase().includes(lower) ||
            p.contactos.some(
              (c) =>
                c.nombre.toLowerCase().includes(lower) ||
                c.puesto.toLowerCase().includes(lower) ||
                c.correo.toLowerCase().includes(lower) ||
                c.telefono.toLowerCase().includes(lower) ||
                (c.extension || "").toLowerCase().includes(lower)
            )
        )
      );
    }
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await axios.put(urlServer + editId, newProveedor);
      } else {
        await axios.post(urlServer, newProveedor);
      }
      setShowModal(false);
      setNewProveedor({ ...emptyProveedor });
      setEditId(null);
      fetchProveedores();
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar proveedor?")) return;
    try {
      await axios.delete(urlServer + id);
      fetchProveedores();
    } catch (err) {}
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditId(proveedor._id || null);
    setNewProveedor({ ...proveedor, contactos: proveedor.contactos.map((c) => ({ ...c })) });
    setShowModal(true);
  };

  const handleAddContacto = () => {
    setNewProveedor({ ...newProveedor, contactos: [...newProveedor.contactos, { ...emptyContacto }] });
  };

  const handleRemoveContacto = (idx: number) => {
    setNewProveedor({ ...newProveedor, contactos: newProveedor.contactos.filter((_, i) => i !== idx) });
  };

  const columns: DataTableColumn<Proveedor>[] = [
    { key: "empresa", label: "Empresa" },
    { key: "direccion", label: "Dirección" },
    { key: "telefono", label: "Teléfono" },
    {
      key: "contactos",
      label: "Contactos",
      render: (p) => (
        <ul className="mb-0 ps-3">
          {p.contactos.map((c, i) => (
            <li key={i}>
              <b>{c.nombre}</b> ({c.puesto})
              <br />
              {c.correo}, {c.telefono}
              {c.extension ? `, ext. ${c.extension}` : ""}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  const totalPages = Math.ceil(filteredProveedores.length / itemsPerPage);
  const paginated = filteredProveedores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por empresa, dirección o contacto..."
          className="flex-grow-1"
        />
        <Button
          variant="success"
          onClick={() => {
            setShowModal(true);
            setEditId(null);
            setNewProveedor({ ...emptyProveedor });
          }}
        >
          Agregar Proveedor
        </Button>
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
          data={paginated}
          actions={(proveedor) => (
            <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => handleEdit(proveedor)}
                title="Editar"
              >
                <i className="fas fa-pencil-alt"></i>
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDelete(proveedor._id!)}
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

      {/* Modal de proveedor */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>{editId ? "Editar Proveedor" : "Agregar Proveedor"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Form>
            <Row>
              <Col md={4} className="mb-3">
                <Form.Label>Empresa</Form.Label>
                <Form.Control
                  type="text"
                  id="proveedor-empresa"
                  placeholder="Empresa"
                  value={newProveedor.empresa}
                  onChange={(e) => setNewProveedor({ ...newProveedor, empresa: e.target.value })}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Dirección</Form.Label>
                <Form.Control
                  type="text"
                  id="proveedor-direccion"
                  placeholder="Dirección"
                  value={newProveedor.direccion}
                  onChange={(e) => setNewProveedor({ ...newProveedor, direccion: e.target.value })}
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Teléfono</Form.Label>
                <Form.Control
                  type="text"
                  id="proveedor-telefono"
                  placeholder="Teléfono"
                  value={newProveedor.telefono}
                  onChange={(e) => setNewProveedor({ ...newProveedor, telefono: e.target.value })}
                />
              </Col>
            </Row>

            <Form.Label>Contactos</Form.Label>
            {newProveedor.contactos.map((c, idx) => (
              <div key={idx} className="mb-2">
                <Row className="align-items-end">
                  <Col md={6} sm={6} xs={12} className="mb-2 mb-md-0">
                    <Form.Control
                      type="text"
                      id={`contacto-nombre-${idx}`}
                      placeholder="Nombre"
                      value={c.nombre}
                      onChange={(e) =>
                        setNewProveedor({
                          ...newProveedor,
                          contactos: newProveedor.contactos.map((x, i) =>
                            i === idx ? { ...x, nombre: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </Col>
                  <Col md={5} sm={5} xs={10} className="mb-2 mb-md-0">
                    <Form.Control
                      type="text"
                      id={`contacto-puesto-${idx}`}
                      placeholder="Puesto"
                      value={c.puesto}
                      onChange={(e) =>
                        setNewProveedor({
                          ...newProveedor,
                          contactos: newProveedor.contactos.map((x, i) =>
                            i === idx ? { ...x, puesto: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </Col>
                  <Col
                    md={1}
                    sm={1}
                    xs={2}
                    className="text-end mb-2 mb-md-0 d-flex align-items-center justify-content-end"
                  >
                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveContacto(idx)}>
                      -
                    </Button>
                  </Col>
                </Row>
                <Row className="align-items-end mt-2">
                  <Col md={4} sm={12} xs={12} className="mb-2 mb-md-0">
                    <Form.Control
                      type="email"
                      id={`contacto-correo-${idx}`}
                      placeholder="Correo"
                      value={c.correo}
                      onChange={(e) =>
                        setNewProveedor({
                          ...newProveedor,
                          contactos: newProveedor.contactos.map((x, i) =>
                            i === idx ? { ...x, correo: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </Col>
                  <Col md={4} sm={6} xs={6} className="mb-2 mb-md-0">
                    <Form.Control
                      type="text"
                      id={`contacto-telefono-${idx}`}
                      placeholder="Teléfono"
                      value={c.telefono}
                      onChange={(e) =>
                        setNewProveedor({
                          ...newProveedor,
                          contactos: newProveedor.contactos.map((x, i) =>
                            i === idx ? { ...x, telefono: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </Col>
                  <Col md={4} sm={6} xs={6} className="mb-2 mb-md-0">
                    <Form.Control
                      type="text"
                      id={`contacto-ext-${idx}`}
                      placeholder="Ext"
                      value={c.extension || ""}
                      onChange={(e) =>
                        setNewProveedor({
                          ...newProveedor,
                          contactos: newProveedor.contactos.map((x, i) =>
                            i === idx ? { ...x, extension: e.target.value } : x
                          ),
                        })
                      }
                    />
                  </Col>
                </Row>
              </div>
            ))}
            <Button variant="outline-primary" size="sm" className="mt-2" onClick={handleAddContacto}>
              Agregar Contacto
            </Button>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Guardar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ProveedorList;
