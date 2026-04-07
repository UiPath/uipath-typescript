import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.integration.test.ts'],
    exclude: ['tests/integration/shared/maestro/**', 'tests/integration/shared/orchestrator/attachments.integration.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'samples/**',
        'packages/cli/**',
        'docs/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
    },
  },
});
