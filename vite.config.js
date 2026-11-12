import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT) || 5173,
    // Dev previews on a laptop may be reached through a generated hostname, which
    // Vite's host check rejects by default (403 "Blocked request").
    allowedHosts: true,
    // The frontend always calls same-origin `/api/...`. In dev, Vite serves the
    // page and forwards `/api` to the Node backend, so there is no base URL to
    // configure and no CORS to negotiate. In production the Node server serves
    // both, so the exact same relative paths keep working.
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        changeOrigin: true,
      },
      // The admin view is server-rendered HTML + its own JSON calls.
      '/admin': {
        target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT) || 4173,
    allowedHosts: true,
  },
})
