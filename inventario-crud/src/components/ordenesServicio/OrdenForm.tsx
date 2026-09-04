import React, { useState } from 'react';
import PhotoCapture from './PhotoCapture';
import SignaturePad from './SignaturePad';
import { toast } from 'react-toastify';

const OrdenForm: React.FC = () => {
  const [tipos, setTipos] = useState<string[]>([]);
  const [cliente, setCliente] = useState('');
  const [actividades, setActividades] = useState('');
  const [solucion, setSolucion] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Por ahora guardamos localmente para pruebas
    const payload = { tipos, cliente, actividades, solucion, presupuesto, photos, signature, createdAt: new Date() };
    const drafts = JSON.parse(localStorage.getItem('ordenes_servicio_drafts' ) || '[]');
    drafts.unshift(payload);
    localStorage.setItem('ordenes_servicio_drafts', JSON.stringify(drafts));
    toast.success('Orden guardada localmente (draft).');
  };

  const serviceTypes = [
    'Instalación', 'Mantención', 'Reparación', 'Inspección', 'Calibración',
    'Limpieza', 'Ajuste', 'Actualización', 'Diagnóstico', 'Repuestos',
    'Eléctrico', 'Mecánico', 'Prueba funcional'
  ];

  const toggleTipo = (t: string) => {
    setTipos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  return (
    <div className="container py-3">
      <div className="text-center mb-3">
        <img src="http://localhost:6062/templates/img/top.png" alt="top" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
        <img src="http://localhost:6062/templates/img/logo.png" alt="logo" style={{ height: 48, objectFit: 'contain' }} />
      </div>
      <h4>Crear Orden de Servicio (móvil)</h4>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Tipo de servicio</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {serviceTypes.map(t => (
              <div key={t} className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`tipo-${t}`}
                  checked={tipos.includes(t)}
                  onChange={() => toggleTipo(t)}
                />
                <label className="form-check-label" htmlFor={`tipo-${t}`}>{t}</label>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Datos del cliente</label>
          <input className="form-control" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Nombre / Dirección" />
        </div>

        <div className="mb-3">
          <label className="form-label">Actividades</label>
          <textarea className="form-control" value={actividades} onChange={e => setActividades(e.target.value)} rows={3} />
        </div>

        <div className="mb-3">
          <label className="form-label">Solución</label>
          <textarea className="form-control" value={solucion} onChange={e => setSolucion(e.target.value)} rows={3} />
        </div>

        <div className="mb-3">
          <label className="form-label">Presupuesto</label>
          <input className="form-control" value={presupuesto} onChange={e => setPresupuesto(e.target.value)} placeholder="Monto estimado" />
        </div>

        <div className="mb-3">
          <label className="form-label">Fotos / Evidencias</label>
          <PhotoCapture onChange={setPhotos} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {photos.map((p, i) => <img key={i} src={p} alt={`p-${i}`} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 6 }} />)}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Firma</label>
          <SignaturePad onChange={setSignature} />
          {signature && <div style={{ marginTop: 8 }}><img src={signature} alt="firma" style={{ maxWidth: 240, border: '1px solid #eee' }} /></div>}
        </div>

        <div className="d-grid gap-2">
          <button className="btn btn-primary" type="submit">Guardar borrador</button>
        </div>
      </form>

      <div className="text-center mt-3">
        <img src="http://localhost:6062/templates/img/bottom-2.png" alt="footer" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6 }} />
      </div>
    </div>
  );
};

export default OrdenForm;
