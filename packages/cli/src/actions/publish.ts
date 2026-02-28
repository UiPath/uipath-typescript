import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import type { EnvironmentConfig } from '../types/index.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { getEnvironmentConfig } from '../utils/env-config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface PublishOptions {
  uipathDir?: string;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  tenantName?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

async function uploadPackage(
  packagePath: string,
  envConfig: EnvironmentConfig,
  logger: { log: (message: string) => void }
): Promise<void> {
  const form = new FormData();
  form.append('uploads[]', fs.createReadStream(packagePath));

  const url = `${envConfig.baseUrl}/${envConfig.orgId}/${envConfig.tenantId}${API_ENDPOINTS.UPLOAD_PACKAGE}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${envConfig.accessToken}`,
      ...form.getHeaders(),
    },
    body: form as any,
  });
  if (!response.ok) {
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.PACKAGE_PUBLISHING);
  }

  const contentType = response.headers.get(AUTH_CONSTANTS.CORS.VALUES.HEADERS);
  if (contentType && contentType.includes(AUTH_CONSTANTS.CONTENT_TYPES.TEXT_HTML)) {
    const responseText = await response.text();
    throw new Error(`${MESSAGES.ERRORS.PACKAGE_UPLOAD_FAILED} ${responseText}`);
  }
}

export async function executePublish(options: PublishOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Publish');

  logger.log(chalk.blue(MESSAGES.INFO.PUBLISHER));

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.PUBLISH,
    logger,
    {
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      tenantId: options.tenantId,
      tenantName: options.tenantName,
      accessToken: options.accessToken,
    }
  );
  if (!envConfig) throw new Error('Missing required configuration');

  const uipathDir = options.uipathDir ?? './.uipath';
  const spinner = ora(MESSAGES.INFO.PUBLISHING_PACKAGE).start();

  try {
    if (!fs.existsSync(uipathDir)) {
      spinner.fail(chalk.red(`${MESSAGES.ERRORS.UIPATH_DIR_NOT_FOUND}`));
      logger.log('');
      logger.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
      throw new Error(MESSAGES.ERRORS.UIPATH_DIR_NOT_FOUND);
    }

    const nupkgFiles = fs
      .readdirSync(uipathDir)
      .filter((file) => file.endsWith('.nupkg'))
      .map((file) => path.join(uipathDir, file));

    if (nupkgFiles.length === 0) {
      spinner.fail(chalk.red(`${MESSAGES.ERRORS.NO_NUPKG_FILES_FOUND}`));
      logger.log('');
      logger.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
      throw new Error(MESSAGES.ERRORS.NO_NUPKG_FILES_FOUND);
    }

    let selectedPackage: string;
    if (nupkgFiles.length === 1) {
      selectedPackage = nupkgFiles[0];
      spinner.text = `Publishing ${path.basename(selectedPackage)}...`;
    } else {
      spinner.stop();
      const response = await inquirer.prompt<{ package: string }>([
        {
          type: 'list',
          name: 'package',
          message: MESSAGES.PROMPTS.SELECT_PACKAGE_TO_PUBLISH,
          choices: nupkgFiles.map((file) => ({
            name: path.basename(file),
            value: file,
          })),
        },
      ]);
      selectedPackage = response.package;
      spinner.start(`Publishing ${path.basename(selectedPackage)}...`);
    }

    await uploadPackage(selectedPackage, envConfig, logger);
    spinner.succeed(chalk.green(MESSAGES.SUCCESS.PACKAGE_PUBLISHED_SUCCESS));
    logger.log('');
    logger.log(chalk.blue(MESSAGES.INFO.PACKAGE_AVAILABLE));
  } catch (error) {
    spinner.fail(chalk.red(`${MESSAGES.ERRORS.PACKAGE_PUBLISHING_FAILED}`));
    throw error;
  }
}
