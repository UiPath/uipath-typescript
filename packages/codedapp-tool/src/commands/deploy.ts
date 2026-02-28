import type { Command } from "commander";
import { executeDeploy } from "@uipath/uipath-ts-cli/actions";

export const registerDeployCommand = (program: Command): void => {
  program
    .command("deploy")
    .description("Deploy or upgrade app in UiPath")
    .option("-n, --name <name>", "App name")
    .option("--baseUrl <url>", "UiPath base URL")
    .option("--orgId <id>", "Organization ID")
    .option("--tenantId <id>", "Tenant ID")
    .option("--folderKey <key>", "Folder key")
    .option("--accessToken <token>", "Access token")
    .action(async (options: Record<string, unknown>) => {
      await executeDeploy({
        name: options.name as string | undefined,
        baseUrl: options.baseUrl as string | undefined,
        orgId: options.orgId as string | undefined,
        tenantId: options.tenantId as string | undefined,
        folderKey: options.folderKey as string | undefined,
        accessToken: options.accessToken as string | undefined,
      });
    });
};
