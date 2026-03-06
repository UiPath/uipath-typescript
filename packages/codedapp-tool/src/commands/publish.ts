import type { Command } from "commander";
import { executePublish } from "@uipath/uipath-ts-cli/actions";
import { withErrorHandling } from "../utils/error-handler.js";

export const registerPublishCommand = (program: Command): void => {
  program
    .command("publish")
    .allowUnknownOption(false)
    .allowExcessArguments(false)
    .description("Publish .nupkg to UiPath and register coded app")
    .option("-n, --name <name>", "Package name (non-interactive)")
    .option("-v, --version <version>", "Package version (requires --name)")
    .option("-t, --type <type>", "App type (Web, Action)", "Web")
    .option("--uipathDir <dir>", "UiPath directory containing packages", "./.uipath")
    .option("--baseUrl <url>", "UiPath base URL")
    .option("--orgId <id>", "Organization ID")
    .option("--tenantId <id>", "Tenant ID")
    .option("--tenantName <name>", "Tenant name")
    .option("--accessToken <token>", "Access token")
    .action(withErrorHandling(async (options: Record<string, unknown>) => {
      await executePublish({
        name: options.name as string | undefined,
        version: options.version as string | undefined,
        type: options.type as string | undefined,
        uipathDir: options.uipathDir as string | undefined,
        baseUrl: options.baseUrl as string | undefined,
        orgId: options.orgId as string | undefined,
        tenantId: options.tenantId as string | undefined,
        tenantName: options.tenantName as string | undefined,
        accessToken: options.accessToken as string | undefined,
      });
    }));
};
