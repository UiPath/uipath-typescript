import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // relative asset paths — base is injected by the platform for coded apps
  build: {
    // each sdk-vX_Y_Z alias becomes its own lazy chunk; only the selected
    // version is ever downloaded by the browser
    chunkSizeWarningLimit: 1500,
  },
});
