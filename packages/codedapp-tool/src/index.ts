#!/usr/bin/env bun
import { createRequire } from "node:module";
import { Command } from "commander";
import { registerCommands } from "./tool.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("codedapp-tool")
  .description("UiPath Coded App Tool - Standalone CLI")
  .version(pkg.version);

// Register all commands (same as when loaded by uipcli)
registerCommands(program);

program.parse(process.argv);
