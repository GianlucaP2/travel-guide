/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_API_URL is baked into the bundle at build time.
// • Dev:        Vite proxy handles /api/* → http://localhost:3001 (no env var needed)
// • Production: Set VITE_API_URL=https://api.yourdomain.com in CF Pages env vars
//               (or as a GitHub Actions variable) before building.
//               Leave empty to use the Cloudflare Tunnel URL — update it after each deploy.

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev proxy: forwards /api/* to the local Express server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
