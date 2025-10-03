import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import builtins from 'builtin-modules';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Get all dependencies from package.json
const allDependencies = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...builtins // Node.js built-in modules
];

// Node.js-specific dependencies to exclude from browser bundle
const nodeDependencies = [
  'file-type',
  'ws', 
  '@opentelemetry/sdk-logs'
];

// Base plugins configuration
const createPlugins = (isBrowser) => [
  resolve({
    browser: isBrowser,
    preferBuiltins: !isBrowser
  }),
  commonjs({
    transformMixedEsModules: true
  }),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    sourceMap: false
  })
];

// Browser-specific plugins with Node.js replacements
const createBrowserPlugins = () => [
  replace({
    preventAssignment: true,
    values: {
      // Replace Node.js dynamic imports with empty promises for browser bundle
      "import('file-type')": "Promise.resolve({})",
      "import('ws')": "Promise.resolve({})",
      // Replace Node.js crypto require with Web Crypto API
      "const crypto = require('crypto')": "const crypto = globalThis.crypto || window.crypto",
      "require('crypto')": "globalThis.crypto || window.crypto"
    }
  }),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs({
    transformMixedEsModules: true
  }),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    sourceMap: false
  })
];

const configs = [
  // ESM bundle (for Node.js and modern bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'es'
    },
    plugins: createPlugins(false),
    external: allDependencies
  },
  // CommonJS bundle (for Node.js)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      exports: 'named'
    },
    plugins: createPlugins(false),
    external: allDependencies
  },
  // UMD bundle (for browsers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'UiPath',
      globals: {
        'file-type': 'FileType',
        'ws': 'WebSocket',
        '@opentelemetry/sdk-logs': 'OpenTelemetry'
      }
    },
    plugins: createBrowserPlugins(),
    external: nodeDependencies // Exclude Node.js-specific deps
  },
  // Type definitions for ESM
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.mts',
      format: 'es'
    },
    plugins: [dts()]
  },
  // Type definitions for CommonJS
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.cts',
      format: 'es'
    },
    plugins: [dts()]
  },
  // Type definitions (main)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];

export default configs; 