import { defineConfig } from "vitest/config";
import { BaseSequencer, type TestSpecification } from "vitest/node";
import { resolve } from "path";

/**
 * Schedules Data Fabric record/query suites first and the schema suite last.
 * The schema suite runs DDL (entity create/update/delete) against the same
 * tenant database the record suites bulk-insert into; when they overlap, the
 * server's SqlBulkCopy fails with "Insert bulk failed due to a schema change
 * of the target table". Keeping them at opposite ends of the schedule means
 * they never share a worker window.
 */
class DataFabricSchemaLastSequencer extends BaseSequencer {
  async sort(files: TestSpecification[]): Promise<TestSpecification[]> {
    const sorted = await super.sort(files);
    const rank = (spec: TestSpecification): number => {
      if (spec.moduleId.includes("entities-schema")) return 2;
      if (spec.moduleId.includes("data-fabric")) return 0;
      return 1;
    };
    return [...sorted].sort((a, b) => rank(a) - rank(b));
  }
}

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
    testTimeout: 30000,
    hookTimeout: 30000,
    sequence: {
      sequencer: DataFabricSchemaLastSequencer,
    },
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
