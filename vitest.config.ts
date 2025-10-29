import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
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

        // Type definitions and constants
        '**/*.types.ts',
        '**/types.ts',
        '**/*.internal-types.ts',
        '**/internal-types.ts',
        '**/*.constants.ts',
        '**/constants/**',
        '**/constants.ts',

        // Error class definitions (exclude all except parser and error-factory which have logic)
        'src/core/errors/*.ts',
        '!src/core/errors/parser.ts',
        '!src/core/errors/error-factory.ts',

        // Pure interface model files (no logic, just TypeScript interfaces)
        'src/models/maestro/cases.models.ts',
        'src/models/maestro/processes.models.ts',
        'src/models/orchestrator/assets.models.ts',
        'src/models/orchestrator/buckets.models.ts',
        'src/models/orchestrator/processes.models.ts',
        'src/models/orchestrator/queues.models.ts',
        'src/models/common/request-spec.ts',

        // Simple utility files
        'src/utils/platform.ts',
        'src/core/config/config-utils.ts',
        'src/core/config/sdk-config.ts',

        // Infrastructure components (integration-heavy, better tested via e2e)
        'src/core/auth/**',
        'src/core/telemetry/**',
      ],
    },
  },
});
