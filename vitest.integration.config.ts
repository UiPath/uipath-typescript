import { defineConfig } from "vitest/config";
import { resolve } from "path";

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
    exclude: [
      "tests/integration/shared/maestro/**",
      "tests/integration/shared/orchestrator/attachments.integration.test.ts",
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
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
