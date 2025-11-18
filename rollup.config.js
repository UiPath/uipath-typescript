import resolve from '@rollup/plugin-node-resolve';  // Resolves node_modules dependencies
import commonjs from '@rollup/plugin-commonjs';     // Converts CommonJS modules to ES6
import typescript from '@rollup/plugin-typescript'; // Compiles TypeScript to JavaScript
import dts from 'rollup-plugin-dts';              // Generates TypeScript declaration files
import json from '@rollup/plugin-json';           // Imports JSON files as ES6 modules
import terser from '@rollup/plugin-terser';       // Minifies JavaScript code
import builtins from 'builtin-modules';           // List of Node.js built-in modules (fs, crypto, etc.)
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const allDependencies = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {}),
  ...builtins                                     // Node.js built-in modules - part of Node.js core, no installation needed (crypto, fs, path, etc.)
];

// Base plugins configuration for Node.js and ESM/CJS builds
const createPlugins = (isBrowser, shouldMinify = false) => {
  const plugins = [
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

  // Add minification for production builds
  if (shouldMinify) {
    plugins.push(
      terser({
        compress: {
          drop_console: false,        // Keep console for debugging
          drop_debugger: true,         // Remove debugger statements
          pure_funcs: ['console.debug'], // Remove console.debug calls
          passes: 2                    // Multiple passes for better compression
        },
        mangle: {
          properties: false            // Don't mangle property names (safer)
        },
        format: {
          comments: false              // Remove all comments
        }
      })
    );

    // Note: Gzip/Brotli compression removed - NPM CDNs compress automatically
    // This reduces package size by 29% (315 KB → 224 KB)
    // CDNs like jsDelivr and unpkg handle compression on-the-fly
  }

  return plugins;
};

// Browser-specific plugins for UMD build
const createBrowserPlugins = (shouldMinify = false) => {
  const plugins = [
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

  // Add minification for production builds
  if (shouldMinify) {
    plugins.push(
      terser({
        compress: {
          drop_console: false,
          drop_debugger: true,
          pure_funcs: ['console.debug'],
          passes: 2
        },
        mangle: {
          properties: false
        },
        format: {
          comments: false
        }
      })
    );

    // Note: Gzip/Brotli compression removed - NPM CDNs compress automatically
    // This reduces package size by 29% (315 KB → 224 KB)
    // CDNs like jsDelivr and unpkg handle compression on-the-fly
  }

  return plugins;
};

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
    plugins: createPlugins(false, true), // ✅ Enable minification & gzip
    external: allDependencies
  },

  // Additional ESM entrypoints for modular imports (POC)
  {
    input: {
      'data-fabric': 'src/entry/data-fabric.ts',
      'data-fabric.entities': 'src/entry/data-fabric.entities.ts',
      'data-fabric.entities.getRecordsById': 'src/entry/data-fabric.entities.getRecordsById.ts',
      'data-fabric.entities.getAll': 'src/entry/data-fabric.entities.getAll.ts',
      'action-center': 'src/entry/action-center.ts',
      'action-center.tasks': 'src/entry/action-center.tasks.ts',
      'action-center.tasks.getAll': 'src/entry/action-center.tasks.getAll.ts',
      'action-center.tasks.getById': 'src/entry/action-center.tasks.getById.ts'
    },
    output: {
      dir: 'dist',
      format: 'es',
      entryFileNames: '[name].mjs',
      chunkFileNames: '_chunks/[name]-[hash].mjs'
    },
    plugins: createPlugins(false, true),
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
    plugins: createPlugins(false, true), // ✅ Enable minification & gzip
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
    plugins: createBrowserPlugins(true)  // ✅ Enable minification & gzip
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

  // Type definitions for modular ESM entrypoints (.d.mts for subpath exports)
  {
    input: {
      'data-fabric': 'src/entry/data-fabric.ts',
      'data-fabric.entities': 'src/entry/data-fabric.entities.ts',
      'data-fabric.entities.getRecordsById': 'src/entry/data-fabric.entities.getRecordsById.ts',
      'data-fabric.entities.getAll': 'src/entry/data-fabric.entities.getAll.ts',
      'action-center': 'src/entry/action-center.ts',
      'action-center.tasks': 'src/entry/action-center.tasks.ts',
      'action-center.tasks.getAll': 'src/entry/action-center.tasks.getAll.ts',
      'action-center.tasks.getById': 'src/entry/action-center.tasks.getById.ts'
    },
    output: {
      dir: 'dist',
      format: 'es',
      entryFileNames: '[name].d.mts'
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