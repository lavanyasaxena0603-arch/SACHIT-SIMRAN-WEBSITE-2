import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//
// STATIC FRONTEND ONLY.
//
// This config used to proxy `/api` and `/admin` to a Node backend that served
// the RSVP guest register. That backend, its SQLite file and its WhatsApp
// notifier have been removed, so there is nothing to proxy to: the invitation
// is a pure static build and `vite build` output is deployable to any static
// host as-is. The ports below are purely for local development previews.
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
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT) || 4173,
    allowedHosts: true,
  },
})
