import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import type { EnvironmentConfig, AppConfig } from '../types/index.js';
import { AppType } from '../types/action-app.js';
import { ACTION_SCHEMA_CONSTANTS, API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { createHeaders, buildAppUrl } from '../utils/api.js';
import { getEnvironmentConfig, isValidAppName, atomicWriteFileSync } from '../utils/env-config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { readAndParseActionSchema } from '../utils/action-schema.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface RegisterAppOptions {
  name?: string;
  version?: string;
  type?: string;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  tenantName?: string;
  folderKey?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

interface RegisterResponse {
  definition: {
    systemName: string;
  };
}

async function publishAppToUiPath(
  packageName: string,
  packageVersion: string,
  isActionApp: boolean,
  envConfig: EnvironmentConfig,
  logger: { log: (message: string) => void }
): Promise<RegisterResponse> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.PUBLISH_CODED_APP}`;
  let actionSchema;
  if (isActionApp) {
    try {
      actionSchema = readAndParseActionSchema();
    } catch (error) {
      throw new Error(
        `${MESSAGES.ERRORS.FAILED_TO_PARSE_ACTION_SCHEMA} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`
      );
    }
  }

  const payload = {
    tenantName: envConfig.tenantName,
    packageName,
    packageVersion,
    title: packageName,
    schema: isActionApp ? actionSchema : {},
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
    await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_REGISTRATION);
  }

  return (await response.json()) as RegisterResponse;
}

function saveAppConfig(config: AppConfig, logger: { log: (message: string) => void }): void {
  const configDir = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
  const configPath = path.join(configDir, AUTH_CONSTANTS.FILES.APP_CONFIG);
  try {
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    atomicWriteFileSync(configPath, config);
  } catch (error) {
    logger.log(chalk.yellow(`${MESSAGES.ERRORS.FAILED_TO_SAVE_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
  }
}

function updateEnvFile(key: string, value: string, logger: { log: (message: string) => void }): void {
  const envPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.ENV_FILE);
  try {
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch {
      // File doesn't exist
    }
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    if (keyRegex.test(envContent)) {
      envContent = envContent.replace(keyRegex, `${key}=${value}`);
    } else {
      if (envContent && !envContent.endsWith('\n')) envContent += '\n';
      envContent += `${key}=${value}\n`;
    }
    atomicWriteFileSync(envPath, envContent);
  } catch (error) {
    logger.log(chalk.yellow(MESSAGES.ERRORS.MANUAL_ENV_INSTRUCTION));
    logger.log(chalk.dim(`${key}=${value}`));
  }
}

async function promptForAppName(logger: { log: (message: string) => void }): Promise<string> {
  const response = await inquirer.prompt<{ name: string }>([
    {
      type: 'input',
      name: 'name',
      message: MESSAGES.PROMPTS.ENTER_APP_NAME,
      validate: (input: string) => {
        if (!input.trim()) return MESSAGES.VALIDATIONS.APP_NAME_REQUIRED;
        if (!isValidAppName(input)) return MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS;
        return true;
      },
    },
  ]);
  return response.name;
}

export async function executeRegisterApp(options: RegisterAppOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.RegisterApp');

  logger.log(chalk.blue(MESSAGES.INFO.APP_REGISTRATION));

  const envConfig = getEnvironmentConfig(
    AUTH_CONSTANTS.REQUIRED_ENV_VARS.REGISTER_APP,
    logger,
    {
      baseUrl: options.baseUrl,
      orgId: options.orgId,
      tenantId: options.tenantId,
      tenantName: options.tenantName,
      folderKey: options.folderKey,
      accessToken: options.accessToken,
    }
  );
  if (!envConfig) throw new Error('Missing required configuration');

  if (options.name && !isValidAppName(options.name)) {
    throw new Error(MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS);
  }

  const appName = options.name ?? (await promptForAppName(logger));
  const appVersion = options.version ?? '1.0.0';
  const isActionApp = (options.type as AppType) === AppType.Action;

  if (isActionApp && !fs.existsSync(path.join(process.cwd(), ACTION_SCHEMA_CONSTANTS.ACTION_SCHEMA_FILENAME))) {
    throw new Error(`${MESSAGES.ERRORS.ACTION_SCHEMA_REQUIRED}\n${MESSAGES.INFO.CREATE_ACTION_SCHEMA_FIRST}`);
  }

  const spinner = ora(MESSAGES.INFO.REGISTERING_APP).start();

  try {
    const response = await publishAppToUiPath(appName, appVersion, isActionApp, envConfig, logger);
    const appSystemName = response.definition.systemName;
    const folderKey = envConfig.folderKey!;
    const appUrl = isActionApp ? null : buildAppUrl(envConfig.baseUrl, envConfig.orgId, envConfig.tenantId, folderKey, appSystemName);

    const appConfig: AppConfig = {
      appName,
      appVersion,
      systemName: appSystemName,
      appUrl,
      registeredAt: new Date().toISOString(),
    };
    saveAppConfig(appConfig, logger);

    if (!isActionApp && appUrl) {
      updateEnvFile('UIPATH_APP_URL', appUrl, logger);
      updateEnvFile('UIPATH_APP_REDIRECT_URI', appUrl, logger);
    }

    spinner.succeed(chalk.green(MESSAGES.SUCCESS.APP_REGISTERED_SUCCESS));
    logger.log('');
    logger.log(chalk.bold('App Details:'));
    logger.log(`  ${chalk.cyan('Name:')} ${appName}`);
    logger.log(`  ${chalk.cyan('Version:')} ${appVersion}`);
    logger.log(`  ${chalk.cyan('System Name:')} ${appSystemName}`);
    logger.log('');
    if (!isActionApp && appUrl) {
      logger.log(chalk.bold('App URL:'));
      logger.log(`  ${chalk.green(appUrl)}`);
      logger.log('');
    }
    logger.log(chalk.blue(MESSAGES.INFO.APP_REGISTERED));
    if (isActionApp) {
      logger.log(chalk.yellow(MESSAGES.INFO.NO_APP_URL_FOR_ACTION_APP));
    } else {
      logger.log(chalk.yellow(MESSAGES.INFO.APP_URL_SAVED_TO_ENV));
    }
    logger.log(chalk.yellow(MESSAGES.INFO.APP_CONFIG_SAVED));
    if (!isActionApp) logger.log(chalk.yellow(MESSAGES.INFO.URL_FOR_OAUTH_CONFIG));
    logger.log('');
    logger.log(chalk.dim(MESSAGES.INFO.NEXT_STEPS));
    logger.log(chalk.dim(MESSAGES.INFO.STEP_BUILD_APP));
    logger.log(chalk.dim(MESSAGES.INFO.STEP_PACKAGE_APP));
    logger.log(chalk.dim(MESSAGES.INFO.STEP_PACKAGE_NOTE));
    logger.log(chalk.dim(MESSAGES.INFO.STEP_PUBLISH_PACKAGE));
  } catch (error) {
    spinner.fail(chalk.red(MESSAGES.ERRORS.APP_REGISTRATION_FAILED));
    throw error;
  }
}
