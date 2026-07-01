import { cp } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'

const require = createRequire(import.meta.url)

/**
 * The validation-station widget loads its PDF renderer and translations from a
 * `du-assets/` folder shipped inside `@uipath/du-validation-station-wc`. In dev
 * those are served straight from node_modules; for the production bundle we copy
 * them next to the build output so the deployed Coded App can find them.
 */
function copyDuValidationStationAssets(): Plugin {
  let destDir = ''
  return {
    name: 'copy-du-validation-station-assets',
    apply: 'build',
    configResolved(config) {
      destDir = resolve(config.root, config.build.outDir, config.build.assetsDir, 'du-assets')
    },
    async closeBundle() {
      const wcRoot = dirname(require.resolve('@uipath/du-validation-station-wc/package.json'))
      await cp(resolve(wcRoot, 'du-assets'), destDir, { recursive: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Coded App requirement: assets must use relative paths so they resolve
  // under the <base href="/your-app-name/"> the platform injects at deploy.
  base: './',
  plugins: [
    react(),
    // Reads uipath.json and injects <meta name="uipath:*"> tags during local
    // dev. The platform injects production values when deployed, so the same
    // SDK init code works in both places.
    uipathCodedApps(),
    copyDuValidationStationAssets(),
  ],
  // The SDK references `global` and `path` (Node-isms); stub/polyfill them for
  // the browser bundle, per the UiPath Coded Apps web-app template.
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
    // The web component ships its own pre-bundled assets; pre-bundling it breaks
    // the du-assets path resolution above.
    exclude: ['@uipath/du-validation-station-wc'],
  },
})
