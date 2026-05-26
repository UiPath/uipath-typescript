import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import builtins from 'builtin-modules';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...builtins
];

const jsPlugins = () => [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs({ transformMixedEsModules: true, ignoreTryCatch: false }),
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false,
    declarationMap: false,
    sourceMap: false
  })
];

export default [
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.mjs', format: 'es', inlineDynamicImports: true },
    plugins: jsPlugins(),
    external
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.cjs', format: 'cjs', exports: 'named', inlineDynamicImports: true },
    plugins: jsPlugins(),
    external
  },
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()],
    external
  }
];
