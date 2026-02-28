import chalk from 'chalk';
import inquirer from 'inquirer';
import * as path from 'path';
import { PUSH_METADATA_RELATIVE_PATH } from '../constants/api.js';
import { AUTH_CONSTANTS, MESSAGES } from '../constants/index.js';
import { PULL_OVERWRITE_LIST_MAX_DISPLAY } from '../constants/pull.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { runPull, isProjectRootDirectory } from '../core/webapp-file-handler/index.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface PullOptions {
  projectId?: string;
  overwrite?: boolean;
  targetDir?: string;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

export async function executePull(options: PullOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Pull');

  logger.log(chalk.blue(MESSAGES.INFO.PULL_HEADER));
  logger.log('');

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.PULL,
    logger,
    {
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      tenantId: options.tenantId,
      accessToken: options.accessToken,
    }
  );
  if (!envConfig) throw new Error('Missing required configuration');

  const projectId = options.projectId ?? process.env.UIPATH_PROJECT_ID;
  if (!projectId) throw new Error(MESSAGES.ERRORS.PULL_PROJECT_ID_REQUIRED);

  const rootDir = options.targetDir
    ? path.resolve(process.cwd(), options.targetDir)
    : process.cwd();

  const targetIsCwd = !options.targetDir;
  if (targetIsCwd && !isProjectRootDirectory(rootDir)) {
    logger.log(chalk.yellow(MESSAGES.ERRORS.PULL_TARGET_NOT_PROJECT_ROOT_WARNING));
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
        logger.log(chalk.gray('Pull cancelled.'));
        return;
      }
    }
  }

  const config = {
    projectId,
    rootDir,
    bundlePath: 'dist',
    manifestFile: PUSH_METADATA_RELATIVE_PATH,
    envConfig,
    logger,
  };

  const promptOverwrite =
    process.stdin.isTTY && !options.overwrite
      ? async (conflictingLocalPaths: string[]): Promise<boolean> => {
          logger.log(chalk.yellow(MESSAGES.ERRORS.PULL_OVERWRITE_CONFLICTS));
          conflictingLocalPaths
            .slice(0, PULL_OVERWRITE_LIST_MAX_DISPLAY)
            .forEach((p) => logger.log(chalk.yellow(`  - ${p}`)));
          if (conflictingLocalPaths.length > PULL_OVERWRITE_LIST_MAX_DISPLAY) {
            logger.log(
              chalk.yellow(
                `  ... and ${conflictingLocalPaths.length - PULL_OVERWRITE_LIST_MAX_DISPLAY} more.`
              )
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

  await runPull(config, { overwrite: options.overwrite ?? false, promptOverwrite });
  logger.log(chalk.green(MESSAGES.SUCCESS.PULL_COMPLETED));
}
