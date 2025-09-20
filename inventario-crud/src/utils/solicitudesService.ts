import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL.endsWith('/')
  ? import.meta.env.VITE_API_URL
  : import.meta.env.VITE_API_URL + '/';

export interface SolicitudPayload {
  tipo: string;
  recursoId: string;
  colaboradorId: string;
  accion: string;
  detalles?: any;
}

export async function crearSolicitud({ tipo, recursoId, colaboradorId, accion, detalles }: SolicitudPayload) {
  return axios.post(`${API_URL}solicitudes`, {
    tipo,
    recursoId,
    colaboradorId,
    accion,
    detalles,
  });
}

export async function obtenerSolicitudes() {
  return axios.get(`${API_URL}solicitudes`);
}

export async function actualizarSolicitud(id: string, data: any) {
  return axios.put(`${API_URL}solicitudes/${id}`, data);
}

export async function eliminarSolicitud(id: string) {
  return axios.delete(`${API_URL}solicitudes/${id}`);
}