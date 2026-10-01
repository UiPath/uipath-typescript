import { configDefaults, defineConfig } from "vitest/config";
import { resolve } from "path";

const INTEGRATION_SUITES = "tests/integration/**/*.integration.test.ts";
const DATA_FABRIC_SCHEMA_SUITE =
  "tests/integration/shared/data-fabric/entities-schema.integration.test.ts";
const DATA_FABRIC_RECORD_SUITES = "tests/integration/shared/data-fabric/**/*.integration.test.ts";

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
    testTimeout: 30000,
    hookTimeout: 30000,
    // Schema DDL (entity create/delete) breaks concurrent bulk inserts server-side
    // ("Insert bulk failed due to a schema change of the target table"), so that suite is
    // not excluded but moved to its own group that runs after the record-writing suites.
    // `include` is per-project: under `extends: true` a root `include` merges into both.
    projects: [
      {
        extends: true,
        test: {
          name: "integration",
          include: [INTEGRATION_SUITES],
          exclude: [...configDefaults.exclude, DATA_FABRIC_RECORD_SUITES],
          sequence: { groupOrder: 0 },
        },
      },
      {
        // Same group as `integration`, split out only to carry `retry`: the Data
        // Fabric service on the CI tenant answers 503/504 to individual record and
        // attachment calls while a leg runs alone, so one re-run of a failed test
        // separates a service fault from a regression. Assertion failures that
        // repeat still fail; hooks are not retried.
        extends: true,
        test: {
          name: "integration-data-fabric",
          include: [DATA_FABRIC_RECORD_SUITES],
          exclude: [...configDefaults.exclude, DATA_FABRIC_SCHEMA_SUITE],
          sequence: { groupOrder: 0 },
          retry: 1,
        },
      },
      {
        extends: true,
        test: {
          name: "integration-ddl",
          include: [DATA_FABRIC_SCHEMA_SUITE],
          sequence: { groupOrder: 1 },
        },
      },
    ],
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
