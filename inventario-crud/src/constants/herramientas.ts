// Get the base API URL from environment variables or fall back to the production URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://192.168.100.150:6051/api';

export const HERRAMIENTAS_ENDPOINTS = {
  BASE: `${API_BASE_URL}/herramientas`,
  PDF: (id: string) => `http://192.168.100.150:6051/api/herramientas/pdf/${id}`,
  BY_ID: (id: string) => `${API_BASE_URL}/herramientas/${id}`,
};

export const MODAL_STYLES = {
  zIndex: 1400,
  mask: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 1300
  }
};