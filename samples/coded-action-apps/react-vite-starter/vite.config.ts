import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths resolve under the <base href> Action Center injects at run time.
  base: './',
  plugins: [react()],
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
})
