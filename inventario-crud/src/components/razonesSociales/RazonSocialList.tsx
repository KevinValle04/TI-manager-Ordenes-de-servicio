import axios from "axios";
import { useEffect, useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";
import { IDireccionEnvio, RazonSocial } from "../../types";
import DataTable, { DataTableColumn } from "../common/DataTable";
import PaginationCompact from "../common/PaginationCompact";
import SearchBar from "../common/SearchBar";

const emptyDireccionEnvio: IDireccionEnvio = { nombre: "", direccion: "", telefono: "", contacto: "" };
const emptyRazonSocial: RazonSocial = {
  nombre: "",
  rfc: "",
  emailEmpresa: "",
  telEmpresa: "",
  celEmpresa: "",
  direccionEmpresa: "",
  emailFacturacion: "",
  direccionEnvio: [{ ...emptyDireccionEnvio }]
};

const RazonSocialList: React.FC = () => {
  const [razonesSociales, setRazonesSociales] = useState<RazonSocial[]>([]);
  const [filteredRazonesSociales, setFilteredRazonesSociales] = useState<RazonSocial[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newRazonSocial, setNewRazonSocial] = useState<RazonSocial>({ ...emptyRazonSocial });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const urlServer = import.meta.env.VITE_API_URL + "razones-sociales/";

  const fetchRazonesSociales = async () => {
    try {
      const res = await axios.get<RazonSocial[]>(urlServer);
      setRazonesSociales(res.data);
      setFilteredRazonesSociales(res.data);
    } catch (err) {
      setRazonesSociales([]);
      setFilteredRazonesSociales([]);
    }
  };

  useEffect(() => {
    fetchRazonesSociales();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term) setFilteredRazonesSociales(razonesSociales);
    else {
      const lower = term.toLowerCase();
      setFilteredRazonesSociales(
        razonesSociales.filter(
          (rs) =>
            rs.nombre.toLowerCase().includes(lower) ||
            rs.rfc.toLowerCase().includes(lower) ||
            rs.emailEmpresa.toLowerCase().includes(lower) ||
            rs.telEmpresa.toLowerCase().includes(lower) ||
            rs.celEmpresa.toLowerCase().includes(lower) ||
            rs.direccionEmpresa.toLowerCase().includes(lower) ||
            rs.emailFacturacion.toLowerCase().includes(lower) ||
            rs.direccionEnvio.some(
              (d) =>
                d.nombre.toLowerCase().includes(lower) ||
                d.direccion.toLowerCase().includes(lower) ||
                (d.telefono || "").toLowerCase().includes(lower) ||
                (d.contacto || "").toLowerCase().includes(lower)
            )
        )
      );
    }
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await axios.put(urlServer + editId, newRazonSocial);
      } else {
        await axios.post(urlServer, newRazonSocial);
      }
      setShowModal(false);
      setNewRazonSocial({ ...emptyRazonSocial });
      setEditId(null);
      fetchRazonesSociales();
    } catch (err) {}
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar razón social?")) return;
    try {
      await axios.delete(urlServer + id);
      fetchRazonesSociales();
    } catch (err) {}
  };

  const handleEdit = (razonSocial: RazonSocial) => {
    setEditId(razonSocial._id || null);
    setNewRazonSocial({ ...razonSocial, direccionEnvio: razonSocial.direccionEnvio.map((d) => ({ ...d })) });
    setShowModal(true);
  };

  const handleAddDireccionEnvio = () => {
    setNewRazonSocial({
      ...newRazonSocial,
      direccionEnvio: [...newRazonSocial.direccionEnvio, { ...emptyDireccionEnvio }]
    });
  };

  const handleRemoveDireccionEnvio = (idx: number) => {
    setNewRazonSocial({
      ...newRazonSocial,
      direccionEnvio: newRazonSocial.direccionEnvio.filter((_, i) => i !== idx)
    });
  };

  const columns: DataTableColumn<RazonSocial>[] = [
    { key: "nombre", label: "Nombre" },
    { key: "rfc", label: "RFC" },
    { key: "emailEmpresa", label: "Email Empresa" },
    { key: "telEmpresa", label: "Teléfono" },
    { key: "celEmpresa", label: "Celular" },
    {
      key: "direccionEnvio",
      label: "Direcciones de Envío",
      render: (rs) => (
        <ul className="mb-0 ps-3">
          {rs.direccionEnvio.map((d, i) => (
            <li key={i}>
              <b>{d.nombre}</b>
              <br />
              {d.direccion}
              {d.telefono && (
                <>
                  <br />
                  Tel: {d.telefono}
                </>
              )}
              {d.contacto && (
                <>
                  <br />
                  Contacto: {d.contacto}
                </>
              )}
            </li>
          ))}
        </ul>
      )
    }
  ];

  const totalPages = Math.ceil(filteredRazonesSociales.length / itemsPerPage);
  const paginated = filteredRazonesSociales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch gap-2 mb-3">
        <SearchBar
          value={searchTerm}
          onChange={handleSearch}
          placeholder="Buscar por nombre, RFC, email o dirección..."
          className="flex-grow-1"
        />
        <Button
          variant="success"
          onClick={() => {
            setShowModal(true);
            setEditId(null);
            setNewRazonSocial({ ...emptyRazonSocial });
          }}
        >
          Agregar Razón Social
        </Button>
      </div>

      {/* Tabla */}
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
          actions={(razonSocial) => (
            <div className="d-flex gap-1 align-items-center" style={{ flexWrap: 'nowrap' }}>
              <Button
                variant="outline-warning"
                size="sm"
                onClick={() => handleEdit(razonSocial)}
                title="Editar"
              >
                <i className="fas fa-pencil-alt"></i>
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => handleDelete(razonSocial._id!)}
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

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl" centered>
        <Modal.Header closeButton className="bg-light border-bottom">
          <Modal.Title>{editId ? "Editar Razón Social" : "Agregar Razón Social"}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4 py-3">
          <Form>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  id="razon-nombre"
                  type="text"
                  placeholder="Nombre de la empresa"
                  value={newRazonSocial.nombre}
                  onChange={(e) => setNewRazonSocial({ ...newRazonSocial, nombre: e.target.value })}
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>RFC</Form.Label>
                <Form.Control
                  id="razon-rfc"
                  type="text"
                  placeholder="RFC"
                  value={newRazonSocial.rfc}
                  onChange={(e) =>
                    setNewRazonSocial({ ...newRazonSocial, rfc: e.target.value.toUpperCase() })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col md={4} className="mb-3">
                <Form.Label>Email Empresa</Form.Label>
                <Form.Control
                  id="razon-emailEmpresa"
                  type="email"
                  placeholder="Email Empresa"
                  value={newRazonSocial.emailEmpresa}
                  onChange={(e) =>
                    setNewRazonSocial({ ...newRazonSocial, emailEmpresa: e.target.value })
                  }
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Teléfono Empresa</Form.Label>
                <Form.Control
                  id="razon-telEmpresa"
                  type="text"
                  placeholder="Teléfono Empresa"
                  value={newRazonSocial.telEmpresa}
                  onChange={(e) =>
                    setNewRazonSocial({ ...newRazonSocial, telEmpresa: e.target.value })
                  }
                />
              </Col>
              <Col md={4} className="mb-3">
                <Form.Label>Celular Empresa</Form.Label>
                <Form.Control
                  id="razon-celEmpresa"
                  type="text"
                  placeholder="Celular Empresa"
                  value={newRazonSocial.celEmpresa}
                  onChange={(e) =>
                    setNewRazonSocial({ ...newRazonSocial, celEmpresa: e.target.value })
                  }
                />
              </Col>
            </Row>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Dirección Empresa</Form.Label>
                <Form.Control
                  id="razon-direccionEmpresa"
                  as="textarea"
                  rows={2}
                  placeholder="Dirección de la empresa"
                  value={newRazonSocial.direccionEmpresa}
                  onChange={(e) =>
                    setNewRazonSocial({ ...newRazonSocial, direccionEmpresa: e.target.value })
                  }
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Email Facturación</Form.Label>
                <Form.Control
                  id="razon-emailFacturacion"
                  type="email"
                  placeholder="Email Facturación"
                  value={newRazonSocial.emailFacturacion}
                  onChange={(e) =>
                    setNewRazonSocial({ ...newRazonSocial, emailFacturacion: e.target.value })
                  }
                />
              </Col>
            </Row>

            <Form.Label>Direcciones de Envío</Form.Label>
            {newRazonSocial.direccionEnvio.map((d, idx) => (
              <div key={idx} className="mb-3 border p-3 rounded">
                <Row className="align-items-end">
                  <Col md={10}>
                    <Row>
                      <Col md={6} className="mb-2">
                        <Form.Label>Nombre</Form.Label>
                        <Form.Control
                          id={`direccion-nombre-${idx}`}
                          type="text"
                          placeholder="Nombre de la dirección"
                          value={d.nombre}
                          onChange={(e) =>
                            setNewRazonSocial({
                              ...newRazonSocial,
                              direccionEnvio: newRazonSocial.direccionEnvio.map((x, i) =>
                                i === idx ? { ...x, nombre: e.target.value } : x
                              )
                            })
                          }
                        />
                      </Col>
                      <Col md={6} className="mb-2">
                        <Form.Label>Teléfono</Form.Label>
                        <Form.Control
                          id={`direccion-telefono-${idx}`}
                          type="text"
                          placeholder="Teléfono (opcional)"
                          value={d.telefono || ""}
                          onChange={(e) =>
                            setNewRazonSocial({
                              ...newRazonSocial,
                              direccionEnvio: newRazonSocial.direccionEnvio.map((x, i) =>
                                i === idx ? { ...x, telefono: e.target.value } : x
                              )
                            })
                          }
                        />
                      </Col>
                    </Row>
                    <Row>
                      <Col md={8} className="mb-2">
                        <Form.Label>Dirección</Form.Label>
                        <Form.Control
                          id={`direccion-direccion-${idx}`}
                          as="textarea"
                          rows={2}
                          placeholder="Dirección completa"
                          value={d.direccion}
                          onChange={(e) =>
                            setNewRazonSocial({
                              ...newRazonSocial,
                              direccionEnvio: newRazonSocial.direccionEnvio.map((x, i) =>
                                i === idx ? { ...x, direccion: e.target.value } : x
                              )
                            })
                          }
                        />
                      </Col>
                      <Col md={4} className="mb-2">
                        <Form.Label>Contacto</Form.Label>
                        <Form.Control
                          id={`direccion-contacto-${idx}`}
                          type="text"
                          placeholder="Persona de contacto (opcional)"
                          value={d.contacto || ""}
                          onChange={(e) =>
                            setNewRazonSocial({
                              ...newRazonSocial,
                              direccionEnvio: newRazonSocial.direccionEnvio.map((x, i) =>
                                i === idx ? { ...x, contacto: e.target.value } : x
                              )
                            })
                          }
                        />
                      </Col>
                    </Row>
                  </Col>
                  <Col md={2} className="text-end">
                    <Button variant="outline-danger" size="sm" onClick={() => handleRemoveDireccionEnvio(idx)}>
                      Eliminar
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Button
              variant="outline-primary"
              size="sm"
              className="mt-2"
              onClick={handleAddDireccionEnvio}
            >
              Agregar Dirección de Envío
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

export default RazonSocialList;
