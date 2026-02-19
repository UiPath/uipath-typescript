import { Command, Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import * as path from 'path';
import { PUSH_METADATA_RELATIVE_PATH } from '../constants/api.js';
import { AUTH_CONSTANTS, MESSAGES } from '../constants/index.js';
import { PULL_OVERWRITE_LIST_MAX_DISPLAY } from '../constants/pull.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { runPull, looksLikeProjectRoot } from '../core/webapp-file-handler/index.js';
import { track } from '../telemetry/index.js';

export default class Pull extends Command {
  static override description =
    'Pull project files from Studio Web into the local workspace (mirror of push)';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> <project-id>',
    '<%= config.bin %> <%= command.id %> <project-id> --overwrite',
    '<%= config.bin %> <%= command.id %> --target-dir ./my-project',
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

    this.log(chalk.blue(MESSAGES.INFO.PULL_HEADER));
    this.log('');

    const envConfig = getEnvironmentConfig(AUTH_CONSTANTS.REQUIRED_ENV_VARS.PULL, this, flags);
    if (!envConfig) process.exit(1);

    const projectId = args['project-id'] || process.env.UIPATH_PROJECT_ID;
    if (!projectId) {
      this.log(chalk.red(MESSAGES.ERRORS.PULL_PROJECT_ID_REQUIRED));
      process.exit(1);
    }

    const rootDir = flags.targetDir
      ? path.resolve(process.cwd(), flags.targetDir)
      : process.cwd();

    // Soft check: when target is CWD, warn if it doesn't look like project root and optionally prompt.
    const targetIsCwd = !flags.targetDir;
    if (targetIsCwd && !looksLikeProjectRoot(rootDir)) {
      this.log(chalk.yellow(MESSAGES.ERRORS.PULL_TARGET_NOT_PROJECT_ROOT_WARNING));
      if (process.stdin.isTTY) {
        const { continueAnyway } = await inquirer.prompt<{ continueAnyway: boolean }>([
          {
            type: 'confirm',
            name: 'continueAnyway',
            message: MESSAGES.PROMPTS.PULL_CONTINUE_NOT_PROJECT_ROOT,
            default: false,
          },
        ]);
        if (!continueAnyway) {
          this.log(chalk.gray('Pull cancelled.'));
          process.exit(0);
        }
      }
    }

    // Same config shape as push (WebAppPushConfig); bundlePath and manifestFile are placeholders so runPull and the API layer accept the same type.
    const config = {
      projectId,
      rootDir,
      bundlePath: 'dist',
      manifestFile: PUSH_METADATA_RELATIVE_PATH,
      envConfig,
      logger: this as { log: (message: string) => void },
    };

    const promptOverwrite =
      process.stdin.isTTY && !flags.overwrite
        ? async (conflictingLocalPaths: string[]): Promise<boolean> => {
            this.log(chalk.yellow(MESSAGES.ERRORS.PULL_OVERWRITE_CONFLICTS));
            conflictingLocalPaths
              .slice(0, PULL_OVERWRITE_LIST_MAX_DISPLAY)
              .forEach((p) => this.log(chalk.yellow(`  - ${p}`)));
            if (conflictingLocalPaths.length > PULL_OVERWRITE_LIST_MAX_DISPLAY) {
              this.log(
                chalk.yellow(`  ... and ${conflictingLocalPaths.length - PULL_OVERWRITE_LIST_MAX_DISPLAY} more.`)
              );
            }
            const { proceed } = await inquirer.prompt<{ proceed: boolean }>([
              {
                type: 'confirm',
                name: 'proceed',
                message: MESSAGES.PROMPTS.PULL_OVERWRITE_CONFIRM,
                default: true,
              },
            ]);
            return proceed;
          }
        : undefined;

    try {
      await runPull(config, { overwrite: flags.overwrite, promptOverwrite });
      this.log(chalk.green(MESSAGES.SUCCESS.PULL_COMPLETED));
    } catch (error) {
      const msg = error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR;
      this.log(chalk.red(`${MESSAGES.ERRORS.PULL_FAILED_PREFIX}${msg}`));
      process.exit(1);
    }
  }
}
