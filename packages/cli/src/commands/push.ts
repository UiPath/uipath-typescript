import { Command, Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import * as path from 'path';
import { PUSH_METADATA_RELATIVE_PATH } from '../constants/api.js';
import { AUTH_CONSTANTS, MESSAGES } from '../constants/index.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { WebAppFileHandler } from '../core/webapp-file-handler/index.js';
import { Preconditions } from '../core/preconditions.js';
import { track } from '../telemetry/index.js';

export default class Push extends Command {
  static override description = 'Push local coded web app build to remote WebApp Project (atomic sync)';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> <project-id>',
    '<%= config.bin %> <%= command.id %> <project-id> --ignore-resources',
    '<%= config.bin %> <%= command.id %> <project-id> --build-dir build',
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

    this.log(chalk.blue(MESSAGES.INFO.PUSH_HEADER));
    this.log('');

    const envConfig = getEnvironmentConfig(AUTH_CONSTANTS.REQUIRED_ENV_VARS.PUSH, this, flags);
    if (!envConfig) process.exit(1);

    const projectId = args['project-id'] || process.env.UIPATH_PROJECT_ID;
    if (!projectId) {
      this.log(chalk.red(MESSAGES.ERRORS.PUSH_PROJECT_ID_REQUIRED));
      return;
    }

    const rootDir = process.cwd();
    const bundlePath = path.normalize(flags.buildDir).replace(/\\/g, '/');

    try {
      Preconditions.validate(rootDir, bundlePath);
    } catch (error) {
      this.log(chalk.red(error instanceof Error ? error.message : MESSAGES.ERRORS.PUSH_VALIDATION_FAILED));
      return;
    }

    const handler = new WebAppFileHandler({
      projectId,
      rootDir,
      bundlePath,
      manifestFile: PUSH_METADATA_RELATIVE_PATH,
      envConfig,
      logger: this,
    });

    try {
      await handler.push();
      await handler.importReferencedResources(flags.ignoreResources);
      this.log(chalk.green(MESSAGES.SUCCESS.PUSH_COMPLETED));
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.PUSH_FAILED_PREFIX}${msg}`));
      process.exit(1);
    }
  }
}
