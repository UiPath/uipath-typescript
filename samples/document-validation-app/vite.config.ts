import react from '@vitejs/plugin-react';
import { cp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

function copyDuValidationStationAssets(): Plugin {
  let destDir = '';
  return {
    name: 'copy-du-validation-station-assets',
    apply: 'build',
    configResolved(config) {
      destDir = resolve(
        config.root,
        config.build.outDir,
        config.build.assetsDir,
        'du-assets',
      );
    },
    async closeBundle() {
      const wcRoot = dirname(
        require.resolve('@uipath/du-validation-station-wc/package.json'),
      );
      await cp(resolve(wcRoot, 'du-assets'), destDir, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), copyDuValidationStationAssets()],
  base: './',
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      path: 'path-browserify',
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
    exclude: ['@uipath/du-validation-station-wc'],
  },
});
