import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'

// https://vite.dev/config/
export default defineConfig({
  // Coded App: assets must use relative paths so they resolve correctly under
  // the <base href="/your-app-name/"> that the platform injects at deploy time.
  base: './',
  plugins: [
    react(),
    // Reads uipath.json and injects <meta name="uipath:*"> tags into index.html
    // during local dev. At deployment, the platform injects production values.
    uipathCodedApps(),
  ],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
})
