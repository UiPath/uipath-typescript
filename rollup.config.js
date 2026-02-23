import resolve from '@rollup/plugin-node-resolve';  // Resolves node_modules dependencies
import commonjs from '@rollup/plugin-commonjs';     // Converts CommonJS modules to ES6
import typescript from '@rollup/plugin-typescript'; // Compiles TypeScript to JavaScript
import dts from 'rollup-plugin-dts';              // Generates TypeScript declaration files
import json from '@rollup/plugin-json';           // Imports JSON files as ES6 modules
import builtins from 'builtin-modules';           // List of Node.js built-in modules (fs, crypto, etc.)
import { readFileSync } from 'fs';

// Custom plugin to rewrite import paths in .d.ts files
// This normalizes core import paths to '../core/index' for cleaner output
function rewriteDtsImports() {
  return {
    name: 'rewrite-dts-imports',
    renderChunk(code) {
      return code.replace(
        /from ['"](?:(?:\.\.\/)+|@\/)core\/(?:types|uipath|index)['"]/g,
        "from '../core/index'"
      );
    }
  };
}


const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const allDependencies = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {}),
  ...builtins                                     // Node.js built-in modules - part of Node.js core, no installation needed (crypto, fs, path, etc.)
];

// Base plugins configuration for Node.js and ESM/CJS builds
const createPlugins = (isBrowser) => [
  resolve({
    browser: isBrowser,        // When true: resolve browser-compatible versions of modules (e.g., polyfills)
    preferBuiltins: !isBrowser // When false: prefer Node.js built-ins (crypto, fs) over browser polyfills
  }),
  commonjs({
    transformMixedEsModules: true, // Handle packages that mix ESM and CommonJS
    ignoreTryCatch: false          // Don't ignore try-catch when transforming
  }),
  json(),                          // Allow importing JSON files as modules
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    sourceMap: false,
    declarationMap: false
  })
];

// Browser-specific plugins for UMD build
const createBrowserPlugins = () => [
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs({
    transformMixedEsModules: true,
    ignoreTryCatch: false
  }),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    sourceMap: false,
    declarationMap: false
  })
];

// Rollup build configurations for different output formats
const configs = [
  // ESM bundle (for Node.js and modern bundlers like Vite, Webpack etc.)
  {
    input: 'src/index.ts',              // Entry point of the SDK
    output: {
      file: 'dist/index.mjs',          // Output as .mjs for explicit ESM
      format: 'es',
      inlineDynamicImports: true
    },
    plugins: createPlugins(false),
    external: allDependencies
  },

  // CommonJS bundle (for Node.js and older bundlers)
  {
    input: 'src/index.ts',              // Entry point of the SDK
    output: {
      file: 'dist/index.cjs',          // Output as .cjs for explicit CommonJS
      format: 'cjs',
      exports: 'named',
      inlineDynamicImports: true
    },
    plugins: createPlugins(false),
    external: allDependencies
  },

  // UMD bundle (for browsers via script tag or older bundlers)
  {
    input: 'src/index.ts',              // Entry point of the SDK
    output: {
      file: 'dist/index.umd.js',       // Output as UMD for universal compatibility
      format: 'umd',                    // Universal Module Definition format
      name: 'UiPath',                   // Global variable name when loaded via script tag
      inlineDynamicImports: true
    },
    plugins: createBrowserPlugins()
  },

  // Main type definitions
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];

// Service-level entry points for modular imports
const serviceEntries = [
  ['core', 'src/core/index.ts', 'core/index'],
  ['entities', 'src/services/data-fabric/index.ts', 'entities/index'],
  ['tasks', 'src/services/action-center/index.ts', 'tasks/index'],
  ['assets', 'src/services/orchestrator/assets/index.ts', 'assets/index'],
  ['queues', 'src/services/orchestrator/queues/index.ts', 'queues/index'],
  ['users', 'src/services/orchestrator/users/index.ts', 'users/index'],
  ['buckets', 'src/services/orchestrator/buckets/index.ts', 'buckets/index'],
  ['processes', 'src/services/orchestrator/processes/index.ts', 'processes/index'],
  ['cases', 'src/services/maestro/cases/index.ts', 'cases/index'],
  ['maestro-processes', 'src/services/maestro/processes/index.ts', 'maestro-processes/index']
];

// Generate ESM, CJS, and DTS builds for each service entry
serviceEntries.forEach(([name, input, output]) => {
  // ESM bundle
  configs.push({
    input,
    output: { file: `dist/${output}.mjs`, format: 'es', inlineDynamicImports: true },
    plugins: createPlugins(false),
    external: allDependencies
  });

  // CommonJS bundle
  configs.push({
    input,
    output: { file: `dist/${output}.cjs`, format: 'cjs', exports: 'named', inlineDynamicImports: true },
    plugins: createPlugins(false),
    external: allDependencies
  });

  // Type definitions
  // Mark core types as external to avoid duplication (cleaner output, smaller files)
  const isCore = name === 'core';
  const dtsExternal = isCore ? [] : [/src\/core\//, /\.\.\/core/, /^@\/core/];

  configs.push({
    input,
    output: { file: `dist/${output}.d.ts`, format: 'es' },
    plugins: isCore
      ? [dts()]
      : [dts(), rewriteDtsImports()],
    external: dtsExternal
  });
});

// Export all build configurations
export default configs;
