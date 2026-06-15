import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Coded App requirement: assets must use relative paths so they resolve
  // correctly under the <base href="/your-app-name/"> the platform injects
  // at deploy time.
  base: './',
  plugins: [
    react(),
    // Reads uipath.json and injects <meta name="uipath:*"> tags into
    // index.html during local dev. At deploy time the platform injects
    // production values, so the same SDK init code works in both places.
    uipathCodedApps(),
  ],
  // The SDK references `global` (a Node-ism) and `path` internally. In a
  // browser bundle we need a stub for `global` and a polyfill for `path` —
  // recommended by the UiPath Coded Apps web-app template.
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      path: 'path-browserify',
    },
  },
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
  // Silence the noisy "Sourcemap for ... points to missing source files"
  // warnings from the data-table widget. The widget ships sourcemaps that
  // reference TypeScript sources it didn't include in its npm package —
  // a widget-packaging issue we can ignore.
  build: {
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, defaultHandler) {
        if (
          warning.code === 'SOURCEMAP_ERROR' &&
          warning.message?.includes('@uipath/ui-widgets-datatable')
        ) {
          return
        }
        defaultHandler(warning)
      },
    },
  },
  css: {
    devSourcemap: false,
  },
})
