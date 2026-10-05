import { defineConfig } from "vitest/config";
import { resolve } from "path";

// 60s default: the platform gateway holds requests up to ~60s, and first-write operations (dynamic table creation) routinely exceed 30s.
const testTimeout = process.env.INTEGRATION_TEST_TIMEOUT
  ? parseInt(process.env.INTEGRATION_TEST_TIMEOUT, 10)
  : 60000;

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@tests": resolve(__dirname, "./tests"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    testTimeout,
    hookTimeout: testTimeout,
    // CI-only: absorbs transient live-env failures (gateway 504s, edge 403s); local runs fail fast.
    retry: process.env.CI ? 2 : 0,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "coverage-integration",
      exclude: [
        "node_modules/",
        "tests/",
        "dist/",
        "samples/**",
        "docs/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/index.ts",
      ],
    },
  },
});
