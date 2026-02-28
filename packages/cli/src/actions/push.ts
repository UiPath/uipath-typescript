import chalk from 'chalk';
import * as path from 'path';
import { PUSH_METADATA_RELATIVE_PATH } from '../constants/api.js';
import { AUTH_CONSTANTS, MESSAGES } from '../constants/index.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { WebAppFileHandler } from '../core/webapp-file-handler/index.js';
import { Preconditions } from '../core/preconditions.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface PushOptions {
  projectId?: string;
  buildDir?: string;
  ignoreResources?: boolean;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

export async function executePush(options: PushOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Push');

  logger.log(chalk.blue(MESSAGES.INFO.PUSH_HEADER));
  logger.log('');

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.PUSH,
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
  if (!projectId) throw new Error(MESSAGES.ERRORS.PUSH_PROJECT_ID_REQUIRED);

  const rootDir = process.cwd();
  const bundlePath = path.normalize(options.buildDir ?? 'dist').replace(/\\/g, '/');

  try {
    Preconditions.validate(rootDir, bundlePath);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : MESSAGES.ERRORS.PUSH_VALIDATION_FAILED
    );
  }

  const handler = new WebAppFileHandler({
    projectId,
    rootDir,
    bundlePath,
    manifestFile: PUSH_METADATA_RELATIVE_PATH,
    envConfig,
    logger,
  });

  await handler.push();
  await handler.importReferencedResources(options.ignoreResources ?? false);
  logger.log(chalk.green(MESSAGES.SUCCESS.PUSH_COMPLETED));
}
