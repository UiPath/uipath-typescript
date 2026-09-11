import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
    ],
    optimizeDeps: {
      include: ['@uipath/uipath-typescript'],
    },
    base: './', // Use relative paths for assets, base is dynamically injected using getAppBase()
  };
});
