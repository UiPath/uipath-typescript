import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { uipathCodedApps } from '@uipath/coded-apps-dev/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Strip `@layer X { ... }` wrappers from a CSS string, keeping the rules
 * inside. Necessary because the data-table widget ships CSS with raw Tailwind
 * `@layer` directives — a widget-build bug. Tailwind 3 won't accept `@layer
 * base` unless `@tailwind base` is in the same root, so it errors when
 * processing the widget's CSS. Removing the wrapper preserves the rules at
 * the default cascade level, which is fine for our use.
 */
function stripLayerWrappers(css: string): string {
  let out = ''
  let i = 0
  while (i < css.length) {
    const match = css.slice(i).match(/^@layer\s+[\w,\s]+\s*\{/)
    if (match) {
      i += match[0].length // skip the `@layer X {`
      let depth = 1
      while (i < css.length && depth > 0) {
        const ch = css[i]
        if (ch === '{') depth++
        else if (ch === '}') depth--
        if (depth > 0) out += ch // keep inner content, drop the matching `}`
        i++
      }
    } else {
      out += css[i]
      i++
    }
  }
  return out
}

/**
 * Strips `@layer` wrappers from every CSS file shipped by
 * `@uipath/ui-widgets-datatable`. The widget's JS internally does
 * `import "./DataTable.css"` (and similar), so those styles end up in
 * Vite's CSS pipeline — and Tailwind 3 errors on `@layer base` if it
 * appears outside a file that also has `@tailwind base`. Patching the
 * on-disk files removes the conflict cleanly. Re-runs on every dev
 * startup so a fresh `npm install` is automatically re-patched.
 */
function patchWidgetStyles() {
  const widgetDir = path.resolve(
    __dirname,
    'node_modules/@uipath/ui-widgets-datatable/dist',
  )

  function patch() {
    if (!fs.existsSync(widgetDir)) return

    const cssFiles: string[] = []
    function walk(dir: string) {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name)
        const stat = fs.statSync(full)
        if (stat.isDirectory()) walk(full)
        else if (name.endsWith('.css')) cssFiles.push(full)
      }
    }
    walk(widgetDir)

    for (const file of cssFiles) {
      const raw = fs.readFileSync(file, 'utf-8')
      if (!raw.includes('@layer')) continue // already patched
      fs.writeFileSync(file, stripLayerWrappers(raw))
    }
  }

  return {
    name: 'patch-widget-datatable-styles',
    config: patch,
    buildStart: patch,
  }
}

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
    patchWidgetStyles(),
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
