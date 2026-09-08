import react from '@vitejs/plugin-react';
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), uipathCodedApps()],
  base: './',
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
});
