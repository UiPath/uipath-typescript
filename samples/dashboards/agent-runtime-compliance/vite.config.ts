import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'
import path from 'path'

// uipathCodedApps() reads uipath.json and injects the <meta name="uipath:*">
// config tags into index.html (dev serve AND production build). The SDK
// (new UiPath()) reads its config from those tags — no VITE_*/.env needed.
// A tenant-neutral build (template) ships a scope-only uipath.json so no tenant
// identity is baked in; the Apps host injects the rest at runtime.
export default defineConfig({
  plugins: [react(), uipathCodedApps()],
  base: './',
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
  server: {
    port: 25173,        // below the 32768/49152 ephemeral ranges (Win/Linux/macOS) — avoids the OS-reserved-port bind failure
    strictPort: true,   // fail fast if port is busy — caller must kill the old server first
  },
})
