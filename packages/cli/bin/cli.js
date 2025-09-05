#!/usr/bin/env node

import { config } from 'dotenv';
import { run } from '@oclif/core';
import { MESSAGES } from '../dist/constants/messages.js';
import chalk from 'chalk';

// Load environment variables from .env file
config({ quiet: true });

// Custom error handling for oclif errors
await run(process.argv.slice(2), import.meta.url)
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
      console.error(chalk.red(`${error.message || MESSAGES.ERRORS.UNEXPECTED_ERROR}`));
      process.exit(error.oclif?.exit || 1);
    }
  });