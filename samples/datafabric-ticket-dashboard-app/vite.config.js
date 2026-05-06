import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['@uipath/uipath-typescript/entities', '@uipath/uipath-typescript/core'],
  },
  server: {
    port: 5174,
    proxy: {
      // Proxy DataFabric calls to staging. The SDK builds URLs like
      // /{orgName}/{tenantName}/datafabric_/api/...
      // For the staging tenant: orgName=dataservicetest, tenantName=ashishTest.
      '/dataservicetest': {
        target: 'https://staging.uipath.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
