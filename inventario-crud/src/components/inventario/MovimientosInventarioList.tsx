// src/components/inventario/MovimientosInventarioList.tsx
import React, { useState, useEffect } from 'react';
import { Button, Col, Form, Modal, Row, Table } from 'react-bootstrap';
import axios from '../../utils/axios-config';
import { IInventoryMovement } from '../../types';
import ExportExcelButton from '../common/ExportExcelButton';
import PaginationCompact from '../common/PaginationCompact';

const MovimientosInventarioList: React.FC = () => {
  const [movimientos, setMovimientos] = useState<IInventoryMovement[]>([]);
  const [filteredMovimientos, setFilteredMovimientos] = useState<IInventoryMovement[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'entrada' | 'salida'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const urlMovimientos = import.meta.env.VITE_API_URL + 'inventory-movements';

  useEffect(() => {
    // Establecer fechas por defecto (última semana)
    const hoy = new Date();
    const hace7Dias = new Date(hoy);
    hace7Dias.setDate(hoy.getDate() - 7);
    
    setFechaDesde(hace7Dias.toISOString().split('T')[0]);
    setFechaHasta(hoy.toISOString().split('T')[0]);
    
    fetchMovimientos();
  }, []);

  const fetchMovimientos = async () => {
    try {
      const params: any = {};
      if (fechaDesde) params.desde = new Date(fechaDesde + 'T00:00:00.000Z').toISOString();
      if (fechaHasta) params.hasta = new Date(fechaHasta + 'T23:59:59.999Z').toISOString();
      
      const res = await axios.get(urlMovimientos, { params });
      setMovimientos(Array.isArray(res.data) ? res.data : []);
      applyFilters(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      setMovimientos([]);
      setFilteredMovimientos([]);
    }
  };

  const applyFilters = (movs: IInventoryMovement[]) => {
    let filtered = [...movs];
    
    if (tipoFiltro !== 'todos') {
      filtered = filtered.filter(mov => mov.tipo === tipoFiltro);
    }
    
    setFilteredMovimientos(filtered);
    setCurrentPage(1);
  };

  useEffect(() => {
    applyFilters(movimientos);
  }, [tipoFiltro]);

  const handleSearch = () => {
    fetchMovimientos();
  };

  // Paginación
  const totalPages = Math.ceil(filteredMovimientos.length / itemsPerPage);
  const paginatedMovimientos = filteredMovimientos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Preparar datos para exportación
  const dataForExport = filteredMovimientos.map(mov => {
    const item = mov.itemId || {};
    return {
      Fecha: mov.fecha ? new Date(mov.fecha).toLocaleString('es-MX') : '-',
      Tipo: mov.tipo === 'entrada' ? 'Entrada' : mov.tipo === 'salida' ? 'Salida' : '-',
      Cantidad: mov.cantidad || 0,
      Producto: (item as any).descripcion || '-',
      Marca: (item as any).marca || '-',
      Modelo: (item as any).modelo || '-',
      Comentario: mov.comentario || '-',
      Usuario: mov.usuario || '-'
    };
  });

  // Calcular totales
  const totales = {
    entradas: filteredMovimientos
      .filter(m => m.tipo === 'entrada')
      .reduce((sum, m) => sum + m.cantidad, 0),
    salidas: filteredMovimientos
      .filter(m => m.tipo === 'salida')
      .reduce((sum, m) => sum + m.cantidad, 0)
  };

  return (
    <div className="container-fluid mt-4 px-1 px-sm-3">
      <h2 className="mb-4">Movimientos de Inventario</h2>

      {/* Tarjetas de resumen */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card border-success" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>Total Entradas</h6>
                  <h4 className="mb-0 text-success" style={{ fontWeight: 600 }}>
                    {totales.entradas.toLocaleString('es-MX')}
                  </h4>
                  <small className="text-muted">Unidades agregadas</small>
                </div>
                <div className="text-success" style={{ fontSize: '2.5rem', opacity: 0.2 }}>
                  <i className="fas fa-arrow-down"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-danger" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>Total Salidas</h6>
                  <h4 className="mb-0 text-danger" style={{ fontWeight: 600 }}>
                    {totales.salidas.toLocaleString('es-MX')}
                  </h4>
                  <small className="text-muted">Unidades retiradas</small>
                </div>
                <div className="text-danger" style={{ fontSize: '2.5rem', opacity: 0.2 }}>
                  <i className="fas fa-arrow-up"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card border-primary" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <div className="card-body py-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>Balance Neto</h6>
                  <h4 className="mb-0 text-primary" style={{ fontWeight: 600 }}>
                    {(totales.entradas - totales.salidas).toLocaleString('es-MX')}
                  </h4>
                  <small className="text-muted">Diferencia entrada/salida</small>
                </div>
                <div className="text-primary" style={{ fontSize: '2.5rem', opacity: 0.2 }}>
                  <i className="fas fa-balance-scale"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-body">
          <Row className="align-items-end">
            <Col md={3}>
              <Form.Label>Fecha Desde</Form.Label>
              <Form.Control
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Fecha Hasta</Form.Label>
              <Form.Control
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </Col>
            <Col md={3}>
              <Form.Label>Tipo</Form.Label>
              <Form.Select
                value={tipoFiltro}
                onChange={(e) => setTipoFiltro(e.target.value as 'todos' | 'entrada' | 'salida')}
              >
                <option value="todos">Todos</option>
                <option value="entrada">Entradas</option>
                <option value="salida">Salidas</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <Button variant="primary" onClick={handleSearch} className="w-100">
                Buscar
              </Button>
            </Col>
          </Row>
        </div>
      </div>

      {/* Botón de exportación */}
      <div className="d-flex justify-content-end mb-3">
        <ExportExcelButton
          data={dataForExport}
          fileName={`movimientos_inventario_${fechaDesde}_${fechaHasta}.xlsx`}
          sheetName="Movimientos"
        />
      </div>

      {/* Tabla de movimientos */}
      <div className="table-responsive" style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
        <Table striped bordered hover size="sm">
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
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
            {paginatedMovimientos.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">
                  No se encontraron movimientos
                </td>
              </tr>
            ) : (
              paginatedMovimientos.map((mov, idx) => {
                const item = mov.itemId || {};
                return (
                  <tr key={idx}>
                    <td>{mov.fecha ? new Date(mov.fecha).toLocaleString('es-MX') : '-'}</td>
                    <td>
                      <span className={`badge ${mov.tipo === 'entrada' ? 'bg-success' : 'bg-danger'}`}>
                        {mov.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                      </span>
                    </td>
                    <td className="text-end">{mov.cantidad || 0}</td>
                    <td>{(item as any).descripcion || '-'}</td>
                    <td>{(item as any).marca || '-'}</td>
                    <td>{(item as any).modelo || '-'}</td>
                    <td>{mov.comentario || '-'}</td>
                    <td>{mov.usuario || '-'}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center my-3">
          <PaginationCompact
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default MovimientosInventarioList;
