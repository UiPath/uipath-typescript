import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'

export default defineConfig({
  base: './',
  // Serve on 3000 to match the redirect URI registered on the External
  // Application (and uipath.json). strictPort fails loudly instead of bumping to
  // 3001 — a different port would break the OAuth redirect_uri match.
  server: {
    port: 3000,
    strictPort: true,
  },
  plugins: [
    react(),
    uipathCodedApps(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
})
