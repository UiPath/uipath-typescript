import resolve from '@rollup/plugin-node-resolve';  // Resolves node_modules dependencies
import commonjs from '@rollup/plugin-commonjs';     // Converts CommonJS modules to ES6
import typescript from '@rollup/plugin-typescript'; // Compiles TypeScript to JavaScript
import dts from 'rollup-plugin-dts';              // Generates TypeScript declaration files
import json from '@rollup/plugin-json';           // Imports JSON files as ES6 modules
import builtins from 'builtin-modules';           // List of Node.js built-in modules (fs, crypto, etc.)
import { readFileSync } from 'fs'; 

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const allDependencies = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {}),
  ...builtins                                     // Node.js built-in modules - part of Node.js core, no installation needed (crypto, fs, path, etc.)
];

// Plugins configuration for Node.js ESM build
const createPlugins = () => [
  resolve({
    preferBuiltins: true  // Prefer Node.js built-ins (crypto, fs, path, etc.)
  }),
  commonjs({
    transformMixedEsModules: true,  // Handle packages that mix ESM and CommonJS
    ignoreTryCatch: false
  }),
  json(),  // Allow importing JSON files as modules
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    sourceMap: false,
    declarationMap: false,
    compilerOptions: {
      removeComments: true  // Strip comments from output
    }
  })
];

// Rollup build configurations for different output formats
const configs = [
  // ESM bundle (for Node.js and modern bundlers)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.mjs',
      format: 'es',
      inlineDynamicImports: true,
      generatedCode: {
        constBindings: true
      }
    },
    plugins: createPlugins(),
    external: allDependencies
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

  // Main type definitions (for package.json "types" field)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];

// Export all build configurations
export default configs; 