import type { Command } from "commander";
import { executeScan } from "@uipath/uipath-ts-cli/actions";
import { withErrorHandling } from "../utils/error-handler.js";

export const registerScanCommand = (program: Command): void => {
  program
    .command("scan")
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .description("Scan TypeScript project for UiPath resource usage and display detected bindings")
    .option("--tsconfig <path>", "Path to tsconfig.json (relative to project root)", "tsconfig.json")
    .action(withErrorHandling(async (options: Record<string, unknown>) => {
      await executeScan({
        tsconfig: options.tsconfig as string | undefined,
      });
    }));
};
