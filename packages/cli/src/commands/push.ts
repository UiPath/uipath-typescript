import { Command, Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import { MESSAGES } from '../constants/index.js';
import { track } from '../telemetry/index.js';
import { executePush } from '../actions/push.js';

export default class Push extends Command {
  static override description = 'Push local coded web app build to remote WebApp Project (atomic sync)';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> <project-id>',
    '<%= config.bin %> <%= command.id %> <project-id> --ignoreResources',
    '<%= config.bin %> <%= command.id %> <project-id> --buildDir build',
    '<%= config.bin %> <%= command.id %> <project-id> --orgId <org-id> --tenantId <tenant-id> --accessToken <token>',
  ];

  static override args = {
    'project-id': Args.string({
      description: 'WebApp Project ID (solution ID). Can also be set via UIPATH_PROJECT_ID environment variable.',
      required: false,
    }),
  };

  static override flags = {
    help: Flags.help({ char: 'h' }),
    buildDir: Flags.string({
      description:
        'Relative path to the build output directory; should be the root of the build output (e.g. dist, build, out). Default: dist',
      default: 'dist',
    }),
    ignoreResources: Flags.boolean({
      description: 'Skip importing the referenced resources to Studio Web solution',
      default: false,
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

  @track('Push')
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Push);
    try {
      await executePush({
        projectId: args['project-id'],
        buildDir: flags.buildDir,
        ignoreResources: flags.ignoreResources,
        baseUrl: flags.baseUrl,
        orgId: flags.orgId,
        tenantId: flags.tenantId,
        accessToken: flags.accessToken,
        logger: this,
      });
      process.exit(0);
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.PUSH_FAILED_PREFIX}${msg}`));
      process.exit(1);
    }
  }
}
