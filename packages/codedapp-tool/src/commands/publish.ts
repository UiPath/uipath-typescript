import type { Command } from "commander";
import { executePublish } from "@uipath/uipath-ts-cli/actions";

export const registerPublishCommand = (program: Command): void => {
  program
    .command("publish")
    .description("Publish .nupkg to UiPath")
    .option("--uipathDir <dir>", "UiPath directory containing packages", "./.uipath")
    .option("--baseUrl <url>", "UiPath base URL")
    .option("--orgId <id>", "Organization ID")
    .option("--tenantId <id>", "Tenant ID")
    .option("--tenantName <name>", "Tenant name")
    .option("--accessToken <token>", "Access token")
    .action(async (options: Record<string, unknown>) => {
      await executePublish({
        uipathDir: options.uipathDir as string | undefined,
        baseUrl: options.baseUrl as string | undefined,
        orgId: options.orgId as string | undefined,
        tenantId: options.tenantId as string | undefined,
        tenantName: options.tenantName as string | undefined,
        accessToken: options.accessToken as string | undefined,
      });
    });
};
