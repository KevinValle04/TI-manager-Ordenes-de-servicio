import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
  
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Permite acceso desde cualquier IP
    port: 80,         // Usar puerto 80 (o puedes cambiarlo)
    strictPort: true, // Asegura que siempre use este puerto
    cors: true,       // Habilita CORS para evitar bloqueos
    hmr: {
      clientPort: 80, // Evita problemas con WebSocket en Vite HMR
    },
    allowedHosts: ['timanager.com', 'www.timanager.com', 'localhost'], // Permite estos dominios
    proxy: {
      '/api': {
        target: 'http://localhost:6051',
        changeOrigin: true,
        secure: false,
      }
    }
  },
})
