import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import json from '@rollup/plugin-json';
import builtins from 'builtin-modules';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Get all dependencies from package.json
const allDependencies = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...builtins // Node.js built-in modules
];

// Base plugins configuration
const createPlugins = (isBrowser) => [
  resolve({
    browser: isBrowser,
    preferBuiltins: !isBrowser
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false
  })
];

const configs = [
  // ESM bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'es'
    },
    plugins: createPlugins(false),
    external: allDependencies
  },
  // CommonJS bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      exports: 'named'
    },
    plugins: createPlugins(false),
    external: allDependencies
  },
  // Type definitions
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