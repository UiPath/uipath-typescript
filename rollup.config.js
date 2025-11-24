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
    declarationMap: false,
    compilerOptions: {
      removeComments: true           // Strip comments from output
    }
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
    declarationMap: false,
    compilerOptions: {
      removeComments: true           // Strip comments from output
    }
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
      inlineDynamicImports: true,
      generatedCode: {
        constBindings: true
      }
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
      inlineDynamicImports: true,
      generatedCode: {
        constBindings: true
      }
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
      inlineDynamicImports: true,
      generatedCode: {
        constBindings: true
      }
    },
    plugins: createBrowserPlugins(),
    external: allDependencies            // Also externalize dependencies for UMD
  },
  
  // Type definitions for ESM (.mts extension for ESM types)
  {
    input: 'src/index.ts',              // Entry point for types
    output: {
      file: 'dist/index.d.mts',        // TypeScript declaration file for ESM
      format: 'es'
    },
    plugins: [dts()]
  },
  
  // Type definitions for CommonJS (.cts extension for CJS types)
  {
    input: 'src/index.ts',              // Entry point for types
    output: {
      file: 'dist/index.d.cts',        // TypeScript declaration file for CJS
      format: 'es'
    },
    plugins: [dts()]
  },
  
  // Main type definitions (for legacy TypeScript and package.json "types" field)
  {
    input: 'src/index.ts',              // Entry point for types
    output: {
      file: 'dist/index.d.ts',         // Main TypeScript declaration file
      format: 'es'
    },
    plugins: [dts()]
  }
];

// Export all build configurations
export default configs; 