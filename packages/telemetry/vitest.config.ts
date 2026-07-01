import { defineConfig } from 'vitest/config';

export default defineConfig({
    // The SDK uses TypeScript legacy decorators (`@track(...)`). Vitest 4 transforms
    // via oxc (Vite 8/rolldown), which defaults to TC39 decorators, so it must be
    // told to parse the legacy form. The package tsconfig only covers `src/`, so
    // oxc doesn't pick up `experimentalDecorators` for test files on its own.
    oxc: {
        decorator: { legacy: true },
    },
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
    },
});
