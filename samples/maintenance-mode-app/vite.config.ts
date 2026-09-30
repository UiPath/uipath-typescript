import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Coded App requirement: assets must use relative paths so they resolve
  // correctly under the <base href="/your-app-name/"> the platform injects
  // at deploy time.
  base: './',
  plugins: [
    react(),
    // Reads uipath.json and injects <meta name="uipath:*"> tags into
    // index.html during local dev. At deploy time the platform injects
    // production values, so the same SDK init code works in both places.
    uipathCodedApps(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
  css: {
    devSourcemap: false,
  },
})
