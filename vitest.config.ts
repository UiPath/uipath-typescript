import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'samples/**',
        'docs/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
    projects: [
      {
        resolve: {
          alias: {
            '@': resolve(__dirname, './src'),
            '@tests': resolve(__dirname, './tests'),
          },
        },
        test: {
          globals: true,
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      './packages/telemetry/vitest.config.ts',
    ],
  },
});
