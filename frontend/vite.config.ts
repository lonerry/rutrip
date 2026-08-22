import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/yandex-geocode': {
        target: 'https://geocode-maps.yandex.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yandex-geocode/, ''),
      },
      '/yandex-search': {
        target: 'https://search-maps.yandex.ru',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/yandex-search/, ''),
      },
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
        headers: { 'User-Agent': 'Rutrip/1.0 (travel map)' },
      },
      '/overpass': {
        target: 'https://overpass-api.de',
        changeOrigin: true,
        rewrite: () => '/api/interpreter',
      },
    },
  },
})
