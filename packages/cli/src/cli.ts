#!/usr/bin/env node

import { config } from 'dotenv';
import { run } from '@oclif/core';
import { MESSAGES } from './constants/messages.js';
import { VERSION_CONSTANTS } from './constants/commands.js';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ quiet: true });

// Handle --version and -v flags with custom format (OCLIF doesn't support customizing the default format)
// Only intercept if --version/-v is the first/only argument, not a subcommand flag
const args = process.argv.slice(2);
if (VERSION_CONSTANTS.FLAGS.some(flag => args[0] === flag)) {
  try {
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    console.log(`${VERSION_CONSTANTS.CLI_NAME} version ${packageJson.version || VERSION_CONSTANTS.UNKNOWN_VERSION}`);
  } catch (error) {
    // This should never happen in normal circumstances since package.json is required for the CLI to work
    console.error(VERSION_CONSTANTS.ERROR_READING_VERSION);
    process.exit(1);
  }
  process.exit(0);
}

// Custom error handling for oclif errors
await run(args, import.meta.url)
  .catch((error) => {
    // Handle specific oclif errors with user-friendly messages
    if (error.message && error.message.includes('Nonexistent flag:')) {
      const flagMatch = error.message.match(/Nonexistent flag: (--?\w+)/);
      const flag = flagMatch ? flagMatch[1] : 'unknown flag';
      
      console.error(chalk.red(`${MESSAGES.ERRORS.UNKNOWN_FLAG} '${flag}'`));
      console.error(chalk.yellow(MESSAGES.HELP.FLAG_HELP));
      process.exit(2);
    } else if (error.message && error.message.includes('not found')) {
      const commandMatch = error.message.match(/command (\S+) not found/);
      const command = commandMatch ? commandMatch[1] : 'unknown command';
      
      console.error(chalk.red(`${MESSAGES.ERRORS.UNKNOWN_COMMAND} '${command}'`));
      console.error(chalk.yellow(MESSAGES.HELP.COMMAND_HELP));
      process.exit(2);
    } else {
      // For other errors, display a generic error message and exit
      console.error(chalk.red(`${error.message || MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(error.oclif?.exit || 1);
    }
  });