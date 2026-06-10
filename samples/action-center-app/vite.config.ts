import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'

// https://vite.dev/config/
export default defineConfig({
  // Coded App requirement: assets must use relative paths so they resolve
  // under the <base href="/your-app-name/"> the platform injects at deploy.
  base: './',
  plugins: [
    react(),
    // Reads uipath.json and injects <meta name="uipath:*"> tags during local
    // dev. The platform injects production values when deployed, so the same
    // SDK init code works in both places.
    uipathCodedApps(),
  ],
  // The SDK references `global` and `path` (Node-isms); stub/polyfill them for
  // the browser bundle, per the UiPath Coded Apps web-app template.
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
