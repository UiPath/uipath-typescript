import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/index.js';
import { track } from '../telemetry/index.js';
import { executeScan } from '../actions/scan.js';

export default class Scan extends Command {
  static override description = 'Scan TypeScript project for UiPath resource usage and display detected bindings';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --tsconfig tsconfig.build.json',
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    tsconfig: Flags.string({
      description: 'Path to tsconfig.json (relative to project root). Default: tsconfig.json',
      default: 'tsconfig.json',
    }),
  };

  @track('Scan')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Scan);
    try {
      await executeScan({
        tsconfig: flags.tsconfig,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.SCAN_FAILED_PREFIX}${msg}`));
      process.exit(1);
    }
  }
}
