import type { Command } from "commander";
import { executeRegisterApp } from "@uipath/uipath-ts-cli/actions";

export const registerRegisterCommand = (program: Command): void => {
  program
    .command("register")
    .description("Register app with UiPath Apps")
    .option("-n, --name <name>", "App name")
    .option("-v, --version <version>", "App version", "1.0.0")
    .option("-t, --type <type>", "App type (Web, Action)", "Web")
    .option("--baseUrl <url>", "UiPath base URL")
    .option("--orgId <id>", "Organization ID")
    .option("--tenantId <id>", "Tenant ID")
    .option("--tenantName <name>", "Tenant name")
    .option("--folderKey <key>", "Folder key")
    .option("--accessToken <token>", "Access token")
    .action(async (options: Record<string, unknown>) => {
      await executeRegisterApp({
        name: options.name as string | undefined,
        version: options.version as string | undefined,
        type: options.type as string | undefined,
        baseUrl: options.baseUrl as string | undefined,
        orgId: options.orgId as string | undefined,
        tenantId: options.tenantId as string | undefined,
        tenantName: options.tenantName as string | undefined,
        folderKey: options.folderKey as string | undefined,
        accessToken: options.accessToken as string | undefined,
      });
    });
};
