import { createRequire } from "node:module";
import { config as loadDotenv } from "dotenv";
import type { Command } from "commander";
import { registerDeployCommand } from "./commands/deploy.js";
import { registerPackCommand } from "./commands/pack.js";
import { registerPullCommand } from "./commands/pull.js";
import { registerPushCommand } from "./commands/push.js";
import { registerPublishCommand } from "./commands/publish.js";
import { loadAuthCredentials } from "./utils/resolve-credentials.js";
const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

// Load CWD .env for project-specific vars (UIPATH_PROJECT_ID, DEBUG, etc.)
// Auth credentials are stored in .uipath/.auth (separate from CWD .env),
// so there are no conflicts with the user's project .env files.
loadDotenv({ quiet: true });

/**
 * Tool metadata for auto-discovery by uipcli
 */
export const metadata = {
  name: "codedapp-tool",
  version: pkg.version,
  description: "UiPath Coded App Tool",
  commandPrefix: "codedapp",
};

/**
 * Register all codedapp tool commands to the CLI program
 * @param program - Commander program instance (from uipcli or standalone)
 */
export const registerCommands = (program: Command): void => {
  // Before any command executes, resolve auth credentials from @uipath/auth.
  // This picks up creds saved by `uipcli login` (with auto-refresh) and
  // populates process.env so getEnvironmentConfig() can find them.
  program.hook("preAction", async () => {
    await loadAuthCredentials();
  });

  registerPushCommand(program);
  registerPullCommand(program);
  registerPackCommand(program);
  registerPublishCommand(program);
  registerDeployCommand(program);
};
