import { defineConfig } from "vitest/config";

const ciOptionalIntegrationExcludes = process.env.CI === "true"
  ? [
      ...(process.env.DATA_FABRIC_ACCESS_INTEGRATION === "true"
        ? []
        : ["tests/integration/shared/data-fabric/access.integration.test.ts"]),
      ...(process.env.AGENT_FEEDBACK_INTEGRATION === "true"
        ? []
        : ["tests/integration/shared/agents/feedback.integration.test.ts"]),
      ...(process.env.TRACES_INTEGRATION === "true"
        ? []
        : ["tests/integration/shared/observability/traces.integration.test.ts"]),
    ]
  : [];

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    exclude: [
      "tests/integration/shared/maestro/**",
      ...ciOptionalIntegrationExcludes,
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
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
