import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['@uipath/uipath-typescript/entities', '@uipath/uipath-typescript/core'],
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy DataFabric calls to alpha. The SDK builds URLs like
      // /{orgName}/{tenantName}/datafabric_/api/... — the orgName here is
      // 'datafabric', so we proxy that path prefix.
      '/datafabric': {
        target: 'https://alpha.uipath.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
