import { defineConfig } from 'tsdown'

export default defineConfig({
  // dev build: src/core.ts is a stale file that no longer compiles
  entry: ['src/*.ts', '!src/core.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  hash: false,
})
