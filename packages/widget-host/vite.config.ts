import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Allow embedding in iframes
  server: {
    headers: {
      'X-Frame-Options': 'ALLOWALL',
    },
  },
  // Optimize deps to include the SDK's dependencies
  optimizeDeps: {
    include: ['ag-grid-react', 'ag-grid-enterprise', 'ag-charts-community'],
  },
});
