import type { Command } from "commander";
import { executePush } from "@uipath/uipath-ts-cli/actions";

export const registerPushCommand = (program: Command): void => {
  program
    .command("push")
    .description("Push local source code to Studio Web")
    .argument("[project-id]", "WebApp Project ID")
    .option("--buildDir <dir>", "Build output directory", "dist")
    .option("--ignoreResources", "Skip importing referenced resources")
    .option("--baseUrl <url>", "UiPath base URL")
    .option("--orgId <id>", "Organization ID")
    .option("--tenantId <id>", "Tenant ID")
    .option("--accessToken <token>", "Access token")
    .action(async (projectId: string | undefined, options: Record<string, unknown>) => {
      await executePush({
        projectId,
        buildDir: options.buildDir as string | undefined,
        ignoreResources: options.ignoreResources as boolean | undefined,
        baseUrl: options.baseUrl as string | undefined,
        orgId: options.orgId as string | undefined,
        tenantId: options.tenantId as string | undefined,
        accessToken: options.accessToken as string | undefined,
      });
    });
};
