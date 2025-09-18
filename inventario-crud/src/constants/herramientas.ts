export const API_BASE_URL = 'http://localhost:6051/api';

export const HERRAMIENTAS_ENDPOINTS = {
  BASE: `${API_BASE_URL}/herramientas`,
  PDF: (id: string) => `${API_BASE_URL}/herramientas/pdf/${id}`,
  BY_ID: (id: string) => `${API_BASE_URL}/herramientas/${id}`,
};

export const MODAL_STYLES = {
  zIndex: 1400,
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1300
  }
};