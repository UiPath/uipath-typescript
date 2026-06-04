import react from '@vitejs/plugin-react';
import { cp, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const require = createRequire(import.meta.url);

const WC_ROOT = dirname(
  require.resolve('@uipath/du-validation-station-wc/package.json'),
);

// Stylesheets the web component fetches (as raw CSS) at runtime to adopt into its
// shadow root.
const WC_RUNTIME_CSS = ['styles.css', 'fonts.css'];

// BUILD: place the web component's runtime files next to the emitted JS chunks, where
// `import.meta.url` will resolve them.
function copyDuValidationStationAssets(): Plugin {
  let assetsDir = '';
  return {
    name: 'copy-du-validation-station-assets',
    apply: 'build',
    configResolved(config) {
      assetsDir = resolve(
        config.root,
        config.build.outDir,
        config.build.assetsDir,
      );
    },
    async closeBundle() {
      await cp(resolve(WC_ROOT, 'du-assets'), resolve(assetsDir, 'du-assets'), {
        recursive: true,
      });
      await cp(resolve(WC_ROOT, 'media'), resolve(assetsDir, 'media'), {
        recursive: true,
      });
      for (const css of WC_RUNTIME_CSS) {
        await cp(resolve(WC_ROOT, css), resolve(assetsDir, css));
      }
    },
  };
}

// DEV: Vite serves any `.css` request as a JS module. Return the real CSS to
// the web component's raw `fetch` (identified by `Sec-Fetch-Dest: empty`), while letting
// genuine ES-module imports (`Sec-Fetch-Dest: script`) pass through to Vite.
function serveDuValidationStationRawCss(): Plugin {
  const pattern = new RegExp(
    `/@uipath/du-validation-station-wc/(${WC_RUNTIME_CSS.join('|')})$`,
  );
  return {
    name: 'serve-du-validation-station-raw-css',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.headers['sec-fetch-dest'] !== 'empty') return next();
        const match = pattern.exec((req.url ?? '').split('?')[0]);
        if (!match) return next();
        readFile(resolve(WC_ROOT, match[1]), 'utf8').then((css) => {
          res.setHeader('Content-Type', 'text/css');
          res.end(css);
        }, next);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    copyDuValidationStationAssets(),
    serveDuValidationStationRawCss(),
  ],
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
