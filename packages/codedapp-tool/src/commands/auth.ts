import type { Command } from "commander";
import { executeAuth } from "@uipath/uipath-ts-cli/actions";

export const registerAuthCommand = (program: Command): void => {
  program
    .command("auth")
    .description("Authenticate with UiPath services (PKCE browser flow or client credentials)")
    .option("-d, --domain <domain>", "UiPath domain (cloud, alpha, staging)")
    .option("--alpha", "Use alpha domain")
    .option("--cloud", "Use cloud domain")
    .option("--staging", "Use staging domain")
    .option("-l, --logout", "Logout and clear stored credentials")
    .option("-f, --force", "Force re-authentication even if valid token exists")
    .option("--clientId <id>", "OAuth client ID (confidential client)")
    .option("--clientSecret <secret>", "OAuth client secret")
    .option("--scope <scope>", "OAuth scope for client credentials")
    .action(async (options: Record<string, unknown>) => {
      await executeAuth({
        domain: options.domain as string | undefined,
        alpha: options.alpha as boolean | undefined,
        cloud: options.cloud as boolean | undefined,
        staging: options.staging as boolean | undefined,
        logout: options.logout as boolean | undefined,
        force: options.force as boolean | undefined,
        clientId: options.clientId as string | undefined,
        clientSecret: options.clientSecret as string | undefined,
        scope: options.scope as string | undefined,
      });
    });
};
