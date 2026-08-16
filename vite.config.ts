import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Desplegado en Cloudflare Pages: build estático (dist/), sin SSR.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Gestión de Camas Hospitalarias',
        short_name: 'Camas',
        description: 'Estado de camas hospitalarias en tiempo real',
        theme_color: '#0B1633',
        background_color: '#F7F9FC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Realtime/API van siempre a red; sólo cacheamos el shell estático.
        navigateFallbackDenylist: [/^\/rest\//, /^\/realtime\//, /^\/auth\//],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
