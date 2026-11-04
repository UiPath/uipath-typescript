import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'
import { templateHost, defaultUiPathJsonPath } from './vite-plugins/template-host'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
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
      // POC stand-in for the Apps server's system route: serves /open/<template>/ from template storage.
      templateHost({
        storageBase: env.TEMPLATES_STORAGE_BASE ?? '',
        uipathJsonPath: defaultUiPathJsonPath(process.cwd()),
      }),
    ],
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
    },
  }
})
