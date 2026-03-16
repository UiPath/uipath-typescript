import { Command, Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/index.js';
import { track } from '../telemetry/index.js';
import { executePull } from '../actions/pull.js';

export default class Pull extends Command {
  static override description =
    'Pull project files from Studio Web into the local workspace. Run from the root of your project, or use --targetDir to specify the target directory.';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> <project-id>',
    '<%= config.bin %> <%= command.id %> <project-id> --overwrite',
    '<%= config.bin %> <%= command.id %> --targetDir ./my-project',
    '<%= config.bin %> <%= command.id %> <project-id> --orgId <org-id> --tenantId <tenant-id> --accessToken <token>',
  ];

  static override args = {
    'project-id': Args.string({
      description:
        'WebApp Project ID (solution ID). Can also be set via UIPATH_PROJECT_ID environment variable.',
      required: false,
    }),
  };

  static override flags = {
    help: Flags.help({ char: 'h' }),
    overwrite: Flags.boolean({
      description: 'Allow overwriting existing local files',
      default: false,
    }),
    targetDir: Flags.string({
      description:
        'Local directory to write pulled files; should be the root of the app project (default: current working directory)',
    }),
    baseUrl: Flags.string({
      description: 'UiPath base URL (default: https://cloud.uipath.com)',
    }),
    orgId: Flags.string({
      description: 'UiPath organization ID',
    }),
    tenantId: Flags.string({
      description: 'UiPath tenant ID',
    }),
    accessToken: Flags.string({
      description: 'UiPath bearer token for authentication',
    }),
  };

  @track('Pull')
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Pull);
    try {
      await executePull({
        projectId: args['project-id'],
        overwrite: flags.overwrite,
        targetDir: flags.targetDir,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.PULL_FAILED_PREFIX}${msg}`));
      process.exit(1);
    }
  }
}
