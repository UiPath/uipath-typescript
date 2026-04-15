import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'node:fs';
import * as path from 'node:path';
import fetch from 'node-fetch';
import type { EnvironmentConfig, AppConfig } from '../types/index.js';
import { AppType } from '../types/action-app.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES, MESSAGE_BUILDERS } from '../constants/messages.js';
import { createHeaders, buildAppUrl } from '../utils/api.js';
import { getEnvironmentConfig, sanitizeAppName, atomicWriteFileSync } from '../utils/env-config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface DeployOptions {
  name?: string;
  /** User-provided semver (--version flag, e.g. "1.2.0") to target a specific published version. Defaults to latest. */
  version?: string;
  baseUrl?: string;
  orgId?: string;
  orgName?: string;
  tenantId?: string;
  folderKey?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

interface DeployedApp {
  id: string;
  title: string;
  systemName: string;
  semVersion: string;
  deployVersion: number;
}

interface DeployedAppResponse {
  value: DeployedApp[];
}

interface PublishedApp {
  systemName: string;
  title: string;
  /** Semver returned by the published apps API (e.g. "1.2.0"). Matched against the user-provided --version flag. */
  appVersion?: string;
  /** Internal integer counter from the published apps API regarding the deployment. */
  deployVersion?: number;
}

interface PublishedAppResponse {
  value: PublishedApp[];
}

interface DeployResponse {
  id: string;
}

function loadAppConfig(logger: { log: (message: string) => void }): AppConfig | null {
  const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR, AUTH_CONSTANTS.FILES.APP_CONFIG);
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content) as AppConfig;
    }
  } catch {
    logger.log(chalk.dim(`${MESSAGES.ERRORS.FAILED_TO_LOAD_APP_CONFIG}`));
  }
  return null;
}

async function getDeployedApp(appName: string, envConfig: EnvironmentConfig): Promise<DeployedApp | null> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.DEPLOYED_APPS}?searchText=${encodeURIComponent(appName)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
      folderKey: envConfig.folderKey,
    }),
  });
  if (!response.ok) await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
  const data = (await response.json()) as DeployedAppResponse;
  return data.value.find((app) => app.title === appName) ?? null;
}

async function getPublishedApp(
  appName: string,
  envConfig: EnvironmentConfig,
  version?: string,
): Promise<PublishedApp | null> {
  const endpoint = API_ENDPOINTS.PUBLISHED_APPS.replace('{tenantId}', envConfig.tenantId);
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${endpoint}?searchText=${encodeURIComponent(appName)}&folderFeedType=tenant`;
  const response = await fetch(url, {
    method: 'GET',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
      folderKey: envConfig.folderKey,
    }),
  });
  if (!response.ok) await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
  const data = (await response.json()) as PublishedAppResponse;
  return data.value.find((app) => app.title === appName && (!version || app.appVersion === version)) ?? null;
}

async function deployNewApp(appName: string, systemName: string, envConfig: EnvironmentConfig): Promise<string> {
  const endpoint = API_ENDPOINTS.DEPLOY_APP.replace('{systemName}', systemName);
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
      folderKey: envConfig.folderKey,
    }),
    body: JSON.stringify({ title: appName, routingName: appName }),
  });
  if (!response.ok) await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
  const data = (await response.json()) as DeployResponse;
  return data.id;
}

async function upgradeApp(appId: string, title: string, version: number, envConfig: EnvironmentConfig): Promise<void> {
  const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.EDIT_DEPLOYED_APP.replace('{appId}', appId)}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: createHeaders({
      bearerToken: envConfig.accessToken,
      tenantId: envConfig.tenantId,
      folderKey: envConfig.folderKey,
    }),
    body: JSON.stringify({ title, version }),
  });
  if (!response.ok) await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_UPGRADE);
}

function updateAppConfig(deploymentId: string, logger: { log: (message: string) => void }): void {
  const configDir = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
  const configPath = path.join(configDir, AUTH_CONSTANTS.FILES.APP_CONFIG);
  try {
    const config = loadAppConfig(logger) ?? ({} as AppConfig);
    config.deploymentId = deploymentId;
    config.deployedAt = new Date().toISOString();
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    atomicWriteFileSync(configPath, config);
  } catch (error) {
    logger.log(
      chalk.yellow(
        `${MESSAGES.ERRORS.FAILED_TO_SAVE_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`,
      ),
    );
  }
}

export async function executeDeploy(options: DeployOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };

  logger.log(chalk.blue(MESSAGES.INFO.APP_DEPLOYMENT));

  const envConfig = getEnvironmentConfig(AUTH_CONSTANTS.REQUIRED_ENV_VARS.DEPLOY, logger, {
    baseUrl: options.baseUrl,
    orgId: options.orgId,
    orgName: options.orgName,
    tenantId: options.tenantId,
    folderKey: options.folderKey,
    accessToken: options.accessToken,
  });
  if (!envConfig) throw new Error('Missing required configuration');

  if (options.name) {
    const { sanitized, isModified } = sanitizeAppName(options.name);
    if (isModified) {
      logger.log(chalk.yellow(MESSAGE_BUILDERS.APP_NAME_SANITIZED(options.name, sanitized)));
      options.name = sanitized;
    }
  }

  const appName = options.name ?? (await getAppName(logger));
  if (!appName) throw new Error(MESSAGES.VALIDATIONS.APP_NAME_REQUIRED);

  const spinner = ora(MESSAGES.INFO.CHECKING_DEPLOYMENT_STATUS).start();

  try {
    const deployedApp = await getDeployedApp(appName, envConfig);
    let version: string;

    if (deployedApp) {
      spinner.text = MESSAGES.INFO.UPGRADING_APP;
      const publishedApp = await getPublishedApp(appName, envConfig, options.version);
      if (!publishedApp) {
        const notFoundMsg = options.version
          ? `${MESSAGES.ERRORS.APP_NOT_PUBLISHED} (version ${options.version})`
          : MESSAGES.ERRORS.APP_NOT_PUBLISHED;
        spinner.fail(chalk.red(notFoundMsg));
        throw new Error(notFoundMsg);
      }
      if (!publishedApp.deployVersion) {
        spinner.fail(chalk.red(MESSAGES.ERRORS.DEPLOY_VERSION_NOT_FOUND));
        throw new Error(MESSAGES.ERRORS.DEPLOY_VERSION_NOT_FOUND);
      }
      await upgradeApp(deployedApp.id, appName, publishedApp.deployVersion, envConfig);
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.APP_UPGRADED_SUCCESS));
      const appConfig = loadAppConfig(logger);
      version = publishedApp.appVersion ?? appConfig?.appVersion ?? deployedApp.semVersion;
      cliTelemetryClient.track('Cli.Deploy', { operation: 'upgrade' });
    } else {
      spinner.text = MESSAGES.INFO.DEPLOYING_APP;
      const publishedApp = await getPublishedApp(appName, envConfig, options.version);
      if (!publishedApp) {
        const notFoundMsg = options.version
          ? `${MESSAGES.ERRORS.APP_NOT_PUBLISHED} (version ${options.version})`
          : MESSAGES.ERRORS.APP_NOT_PUBLISHED;
        spinner.fail(chalk.red(notFoundMsg));
        throw new Error(notFoundMsg);
      }
      const deploymentId = await deployNewApp(appName, publishedApp.systemName, envConfig);
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.APP_DEPLOYED_SUCCESS));
      updateAppConfig(deploymentId, logger);
      const appConfig = loadAppConfig(logger);
      version = appConfig?.appVersion ?? '1.0.0';
      cliTelemetryClient.track('Cli.Deploy', { operation: 'fresh_deploy' });
    }

    logger.log('');
    logger.log(`  ${chalk.cyan('App Name:')} ${appName}`);
    logger.log(`  ${chalk.cyan('Version:')} ${version}`);

    const appConfig = loadAppConfig(logger);
    if (appConfig?.appType === AppType.Action) {
      logger.log(`  ${chalk.yellow(MESSAGES.INFO.ACTION_APP_RUN_IN_ACTION_CENTER)}`);
    } else {
      const appUrl = buildAppUrl(envConfig.baseUrl, envConfig.orgName, appName);
      logger.log(`  ${chalk.cyan('App URL:')} ${chalk.green(appUrl)}`);
    }
  } catch (error) {
    spinner.fail(chalk.red(MESSAGES.ERRORS.APP_DEPLOYMENT_FAILED));
    throw error;
  }
}

async function getAppName(logger: { log: (message: string) => void }): Promise<string | null> {
  const appConfig = loadAppConfig(logger);
  if (appConfig?.appName) return appConfig.appName;
  const response = await inquirer.prompt<{ name: string }>([
    {
      type: 'input',
      name: 'name',
      message: MESSAGES.PROMPTS.ENTER_APP_NAME,
      validate: (input: string) => {
        if (!input.trim()) return MESSAGES.VALIDATIONS.APP_NAME_REQUIRED;
        return true;
      },
    },
  ]);
  const { sanitized, isModified } = sanitizeAppName(response.name);
  if (isModified) {
    logger.log(chalk.yellow(MESSAGE_BUILDERS.APP_NAME_SANITIZED(response.name, sanitized)));
  }
  return sanitized;
}
