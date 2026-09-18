import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite';

export default defineConfig({
  // Coded App requirement: relative asset paths, so they resolve under the
  // <base href="/your-app-name/"> the platform injects at deploy time.
  base: './',
  plugins: [react(), uipathCodedApps()],
  build: {
    rollupOptions: {
      output: {
        // Split the vendors apart rather than shipping one large bundle. Keeps
        // each emitted file modest and lets the browser cache React and the
        // design system separately from the app's own code.
        //
        // Vite 8 runs on rolldown, where manualChunks is a function rather than
        // the object map older Vite accepted.
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('react')) return 'react';
          if (id.includes('@uipath/uipath-typescript')) return 'sdk';
          if (id.includes('@uipath/apollo') || id.includes('lucide')) return 'apollo';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
