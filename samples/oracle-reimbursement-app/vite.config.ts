import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite';

export default defineConfig({
  plugins: [
    react(),
    /*
     * Reads uipath.json and injects <meta name="uipath:*"> tags into index.html for
     * `npm run dev` — the same tags the platform injects at deploy time. That is why
     * this app has no .env: one config file, one code path, both environments.
     */
    uipathCodedApps(),
  ],

  /*
   * Coded App requirement: assets must use RELATIVE paths, because the platform serves
   * a deployed app under <base href="/your-app-name/">. Absolute paths 404 there.
   */
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          uipath: ['@uipath/uipath-typescript'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
