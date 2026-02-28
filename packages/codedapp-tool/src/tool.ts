import { createRequire } from "node:module";
import { config as loadDotenv } from "dotenv";
import type { Command } from "commander";
import { registerAuthCommand } from "./commands/auth.js";
import { registerDeployCommand } from "./commands/deploy.js";
import { registerPackCommand } from "./commands/pack.js";
import { registerPullCommand } from "./commands/pull.js";
import { registerPushCommand } from "./commands/push.js";
import { registerPublishCommand } from "./commands/publish.js";
import { registerRegisterCommand } from "./commands/register.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

loadDotenv({ quiet: true } as any);

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
  registerAuthCommand(program);
  registerPushCommand(program);
  registerPullCommand(program);
  registerPackCommand(program);
  registerPublishCommand(program);
  registerRegisterCommand(program);
  registerDeployCommand(program);
};
