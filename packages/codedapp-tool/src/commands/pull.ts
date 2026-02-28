import type { Command } from "commander";
import { executePull } from "@uipath/uipath-ts-cli/actions";

export const registerPullCommand = (program: Command): void => {
  program
    .command("pull")
    .description("Pull project files from Studio Web")
    .argument("[project-id]", "WebApp Project ID")
    .option("--overwrite", "Allow overwriting existing local files")
    .option("--targetDir <dir>", "Local directory to write pulled files")
    .option("--baseUrl <url>", "UiPath base URL")
    .option("--orgId <id>", "Organization ID")
    .option("--tenantId <id>", "Tenant ID")
    .option("--accessToken <token>", "Access token")
    .action(async (projectId: string | undefined, options: Record<string, unknown>) => {
      await executePull({
        projectId,
        overwrite: options.overwrite as boolean | undefined,
        targetDir: options.targetDir as string | undefined,
        baseUrl: options.baseUrl as string | undefined,
        orgId: options.orgId as string | undefined,
        tenantId: options.tenantId as string | undefined,
        accessToken: options.accessToken as string | undefined,
      });
    });
};
