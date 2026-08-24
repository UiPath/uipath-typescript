import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'

export default defineConfig({
  plugins: [
    react(),
    // Reads uipath.json and injects <meta name="uipath:*"> tags into
    // index.html during local dev. At deploy time the platform injects
    // production values, so the same SDK init code works in both places.
    uipathCodedApps(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          markdown: ['react-markdown']
        }
      }
    }
  },
  base: './',
})
