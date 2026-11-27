import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths resolve under the <base href> the platform injects at deploy time.
  base: './',
  // uipathCodedApps() writes uipath.json into the <meta name="uipath:*"> tags the SDK reads;
  // a deployed app gets the platform's values instead.
  plugins: [react(), uipathCodedApps()],
  optimizeDeps: {
    include: ['@uipath/uipath-typescript'],
  },
})
