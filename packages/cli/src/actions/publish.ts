import chalk from 'chalk';
import inquirer from 'inquirer';
import ora, { type Ora } from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import type { EnvironmentConfig, AppConfig } from '../types/index.js';
import { AppType } from '../types/action-app.js';
import { ACTION_SCHEMA_CONSTANTS, API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { getEnvironmentConfig, atomicWriteFileSync } from '../utils/env-config.js';
import { createHeaders } from '../utils/api.js';
import { handleHttpError } from '../utils/error-handler.js';
import { readAndParseActionSchema } from '../utils/action-schema.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface PublishOptions {
  uipathDir?: string;
  name?: string;
  version?: string;
  type?: string;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  tenantName?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

interface RegisterResponse {
  definition: {
    systemName: string;
  };
  deployVersion?: number;
}

interface PackageMetadata {
  packageName: string;
  packageVersion: string;
}

function extractPackageMetadata(packagePath: string): PackageMetadata {
  const filename = path.basename(packagePath, '.nupkg');
  const parts = filename.split('.');

  let versionStartIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) {
      versionStartIndex = i;
      break;
    }
  }

  if (versionStartIndex <= 0) {
    versionStartIndex = parts.length - 3;
  }

  return {
    packageName: parts.slice(0, versionStartIndex).join('.'),
    packageVersion: parts.slice(versionStartIndex).join('.'),
  };
}

async function uploadPackage(
  packagePath: string,
  envConfig: EnvironmentConfig,
  spinner: Ora,
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

  // Handle 409 Conflict with errorCode 1004 (Package already exists)
  if (response.status === AUTH_CONSTANTS.HTTP_STATUS.CONFLICT) {
    try {
      const errorBody = (await response.json()) as { errorCode?: number; message?: string };
      if (errorBody.errorCode === AUTH_CONSTANTS.ERROR_CODES.PACKAGE_ALREADY_EXISTS) {
        spinner.info(chalk.yellow(MESSAGES.INFO.PACKAGE_ALREADY_EXISTS));
        spinner.start();
        return;
      }
    } catch {
      // Fall through to generic error handler
    }
  }

  if (!response.ok) {
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.PACKAGE_PUBLISHING);
  }

  const contentType = response.headers.get(AUTH_CONSTANTS.CORS.VALUES.HEADERS);
  if (contentType && contentType.includes(AUTH_CONSTANTS.CONTENT_TYPES.TEXT_HTML)) {
    const responseText = await response.text();
    throw new Error(`${MESSAGES.ERRORS.PACKAGE_UPLOAD_FAILED} ${responseText}`);
  }
}

async function registerCodedApp(
  metadata: PackageMetadata,
  envConfig: EnvironmentConfig,
  isActionApp: boolean,
  logger: { log: (message: string) => void },
): Promise<RegisterResponse> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.PUBLISH_CODED_APP}`;

  let actionSchema = {};
  if (isActionApp) {
    try {
      actionSchema = readAndParseActionSchema();
    } catch (error) {
      logger.log('');
      logger.log(chalk.red(`${MESSAGES.ERRORS.FAILED_TO_PARSE_ACTION_SCHEMA} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      throw error;
    }
  }

  const payload = {
    tenantName: envConfig.tenantName,
    packageName: metadata.packageName,
    packageVersion: metadata.packageVersion,
    title: metadata.packageName,
    schema: actionSchema,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
    }),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.CODED_APP_REGISTRATION);
  }

  return (await response.json()) as RegisterResponse;
}

async function saveAppConfig(config: AppConfig): Promise<void> {
  const configDir = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
  const configPath = path.join(configDir, AUTH_CONSTANTS.FILES.APP_CONFIG);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  atomicWriteFileSync(configPath, config);
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
    },
  );
  if (!envConfig) throw new Error('Missing required configuration');

  const isActionApp = (options.type as AppType) === AppType.Action;

  if (isActionApp && !fs.existsSync(path.join(process.cwd(), ACTION_SCHEMA_CONSTANTS.ACTION_SCHEMA_FILENAME))) {
    throw new Error(MESSAGES.ERRORS.ACTION_SCHEMA_REQUIRED);
  }

  const uipathDir = options.uipathDir ?? './.uipath';
  const spinner = ora(MESSAGES.INFO.PUBLISHING_PACKAGE).start();

  try {
    if (!fs.existsSync(uipathDir)) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.UIPATH_DIR_NOT_FOUND));
      logger.log('');
      logger.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
      throw new Error(MESSAGES.ERRORS.UIPATH_DIR_NOT_FOUND);
    }

    const nupkgFiles = fs
      .readdirSync(uipathDir)
      .filter((file) => file.endsWith('.nupkg'))
      .map((file) => path.join(uipathDir, file));

    if (nupkgFiles.length === 0) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.NO_NUPKG_FILES_FOUND));
      logger.log('');
      logger.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
      throw new Error(MESSAGES.ERRORS.NO_NUPKG_FILES_FOUND);
    }

    let selectedPackage: string;

    if (options.name) {
      let matchingPackage: string | undefined;

      if (options.version) {
        const expectedFilename = `${options.name}.${options.version}.nupkg`;
        matchingPackage = nupkgFiles.find((file) => path.basename(file) === expectedFilename);
        if (!matchingPackage) {
          spinner.fail(chalk.red(`No package found matching name: ${options.name} and version: ${options.version}`));
          logger.log('');
          logger.log(chalk.yellow('Available packages:'));
          nupkgFiles.forEach((file) => logger.log(chalk.dim(`  - ${path.basename(file)}`)));
          throw new Error(`No package found matching name: ${options.name} and version: ${options.version}`);
        }
      } else {
        matchingPackage = nupkgFiles.find((file) => {
          const basename = path.basename(file);
          return basename.startsWith(`${options.name}.`) || basename === `${options.name}.nupkg`;
        });
        if (!matchingPackage) {
          spinner.fail(chalk.red(`No package found matching name: ${options.name}`));
          logger.log('');
          logger.log(chalk.yellow('Available packages:'));
          nupkgFiles.forEach((file) => logger.log(chalk.dim(`  - ${path.basename(file)}`)));
          throw new Error(`No package found matching name: ${options.name}`);
        }
      }
      selectedPackage = matchingPackage;
    } else if (nupkgFiles.length === 1) {
      selectedPackage = nupkgFiles[0];
    } else {
      spinner.stop();
      const response = await inquirer.prompt<{ package: string }>([{
        type: 'list',
        name: 'package',
        message: MESSAGES.PROMPTS.SELECT_PACKAGE_TO_PUBLISH,
        choices: nupkgFiles.map((file) => ({
          name: path.basename(file),
          value: file,
        })),
      }]);
      selectedPackage = response.package;
      spinner.start();
    }

    const metadata = extractPackageMetadata(selectedPackage);

    // Step 1: Upload package to Orchestrator
    spinner.text = MESSAGES.INFO.UPLOADING_PACKAGE;
    await uploadPackage(selectedPackage, envConfig, spinner);
    spinner.succeed(chalk.green(MESSAGES.SUCCESS.PACKAGE_UPLOADED_SUCCESS));

    // Step 2: Register coded app
    spinner.start(MESSAGES.INFO.REGISTERING_CODED_APP);
    const registerResponse = await registerCodedApp(metadata, envConfig, isActionApp, logger);
    spinner.succeed(chalk.green(MESSAGES.SUCCESS.CODED_APP_REGISTERED_SUCCESS));

    // Step 3: Save app configuration
    try {
      await saveAppConfig({
        appName: metadata.packageName,
        appVersion: metadata.packageVersion,
        systemName: registerResponse.definition.systemName,
        appUrl: null,
        registeredAt: new Date().toISOString(),
        appType: isActionApp ? AppType.Action : AppType.Web,
      });
    } catch (error) {
      logger.log(chalk.yellow(`${MESSAGES.ERRORS.FAILED_TO_SAVE_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
    }

    logger.log('');
    logger.log(chalk.bold('Published App Details:'));
    logger.log(`  ${chalk.cyan('Name:')} ${metadata.packageName}`);
    logger.log(`  ${chalk.cyan('Version:')} ${metadata.packageVersion}`);
    logger.log(`  ${chalk.cyan('System Name:')} ${registerResponse.definition.systemName}`);
    if (registerResponse.deployVersion) {
      logger.log(`  ${chalk.cyan('Deploy Version:')} ${registerResponse.deployVersion}`);
    }
    logger.log('');
    logger.log(chalk.blue(MESSAGES.INFO.PACKAGE_AVAILABLE));
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.PACKAGE_PUBLISHING_FAILED));
    }
    throw error;
  }
}
