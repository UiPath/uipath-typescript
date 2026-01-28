import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { EnvironmentConfig, AppConfig, AppType } from '../types/index.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { createHeaders, buildAppUrl } from '../utils/api.js';
import { getEnvironmentConfig, isValidAppName, atomicWriteFileSync } from '../utils/env-config.js';
import { handleHttpError } from '../utils/error-handler.js';
import { cliTelemetryClient } from '../telemetry/index.js';

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
}

interface PublishedAppResponse {
  value: PublishedApp[];
}

interface DeployResponse {
  id: string;
}

export default class Deploy extends Command {
  static override description = 'Deploy or upgrade a UiPath app';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name MyApp',
    "<%= config.bin %> <%= command.id %> --name 'MyApp' --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --orgName 'YourOrgName' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --folderKey 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'App name',
    }),
    baseUrl: Flags.string({
      description: 'UiPath base URL (default: https://cloud.uipath.com)',
    }),
    orgId: Flags.string({
      description: 'UiPath organization ID',
    }),
    orgName: Flags.string({
      description: 'UiPath organization name',
    }),
    tenantId: Flags.string({
      description: 'UiPath tenant ID',
    }),
    folderKey: Flags.string({
      description: 'UiPath folder key',
    }),
    accessToken: Flags.string({
      description: 'UiPath bearer token for authentication',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Deploy);

    this.log(chalk.blue(MESSAGES.INFO.APP_DEPLOYMENT));

    // Validate environment variables or flags
    const envConfig = getEnvironmentConfig(AUTH_CONSTANTS.REQUIRED_ENV_VARS.DEPLOY, this, flags);
    if (!envConfig) {
      process.exit(1);
    }

    // Validate name flag if provided
    if (flags.name && !isValidAppName(flags.name)) {
      this.log(chalk.red(MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS));
      process.exit(1);
    }

    // Get app name from flags, config, or prompt
    const appName = flags.name || await this.getAppName();

    if (!appName) {
      this.log(chalk.red(MESSAGES.VALIDATIONS.APP_NAME_REQUIRED));
      process.exit(1);
    }

    await this.deployApp(appName, envConfig);
  }

  private async getAppName(): Promise<string | null> {
    // Try to get from app config first
    const appConfig = this.loadAppConfig();
    if (appConfig?.appName) {
      return appConfig.appName;
    }

    // Prompt for app name
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: MESSAGES.PROMPTS.ENTER_APP_NAME,
        validate: (input: string) => {
          if (!input.trim()) {
            return MESSAGES.VALIDATIONS.APP_NAME_REQUIRED;
          }
          if (!isValidAppName(input)) {
            return MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS;
          }
          return true;
        },
      },
    ]);

    return response.name;
  }

  private loadAppConfig(): AppConfig | null {
    const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR, AUTH_CONSTANTS.FILES.APP_CONFIG);
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(content) as AppConfig;
      }
    } catch (error) {
      this.log(chalk.dim(`${MESSAGES.ERRORS.FAILED_TO_LOAD_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
    }
    return null;
  }

  private async deployApp(appName: string, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora(MESSAGES.INFO.CHECKING_DEPLOYMENT_STATUS).start();

    try {
      // Check if app is already deployed
      const deployedApp = await this.getDeployedApp(appName, envConfig);
      let systemName: string;
      let version: string;

      if (deployedApp) {
        // App is deployed, upgrade it
        spinner.text = MESSAGES.INFO.UPGRADING_APP;
        await this.upgradeApp(deployedApp.id, envConfig);
        spinner.succeed(chalk.green(MESSAGES.SUCCESS.APP_UPGRADED_SUCCESS));
        systemName = deployedApp.systemName;
        // Get version from app config (has the new version being deployed)
        const appConfig = this.loadAppConfig();
        version = appConfig?.appVersion || deployedApp.semVersion;
        // Track upgrade operation
        cliTelemetryClient.track('Cli.Deploy', { operation: 'upgrade' });
      } else {
        // App not deployed, do initial deployment
        spinner.text = MESSAGES.INFO.DEPLOYING_APP;

        // Get systemName from published app
        const publishedSystemName = await this.getPublishedAppSystemName(appName, envConfig);
        if (!publishedSystemName) {
          spinner.fail(chalk.red(MESSAGES.ERRORS.APP_NOT_PUBLISHED));
          process.exit(1);
        }

        const deploymentId = await this.deployNewApp(appName, publishedSystemName, envConfig);
        spinner.succeed(chalk.green(MESSAGES.SUCCESS.APP_DEPLOYED_SUCCESS));

        // Save deployment ID to config
        await this.updateAppConfig(deploymentId);

        systemName = publishedSystemName;
        // Get version from app config
        const appConfig = this.loadAppConfig();
        version = appConfig?.appVersion || '1.0.0';
        // Track fresh deploy operation
        cliTelemetryClient.track('Cli.Deploy', { operation: 'fresh_deploy' });
      }

      this.log('');
      this.log(`  ${chalk.cyan('App Name:')} ${appName}`);
      this.log(`  ${chalk.cyan('Version:')} ${version}`);

      // Only show app URL for non-action apps
      const appConfig = this.loadAppConfig();
      if (appConfig?.appType !== AppType.Action) {
        const appUrl = buildAppUrl(envConfig.baseUrl, envConfig.orgName, appName);
        this.log(`  ${chalk.cyan('App URL:')} ${chalk.green(appUrl)}`);
      }

    } catch (error) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.APP_DEPLOYMENT_FAILED));
      this.log(chalk.red(`${MESSAGES.ERRORS.DEPLOYMENT_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }

  private async getDeployedApp(appName: string, envConfig: EnvironmentConfig): Promise<DeployedApp | null> {
    const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.DEPLOYED_APPS}?searchText=${encodeURIComponent(appName)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: createHeaders({
        bearerToken: envConfig.accessToken,
        tenantId: envConfig.tenantId,
        folderKey: envConfig.folderKey,
      }),
    });

    if (!response.ok) {
      await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
    }

    const data = await response.json() as DeployedAppResponse;

    // Find exact match by title
    return data.value.find(app => app.title === appName) || null;
  }

  private async getPublishedAppSystemName(appName: string, envConfig: EnvironmentConfig): Promise<string | null> {
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

    if (!response.ok) {
      await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
    }

    const data = await response.json() as PublishedAppResponse;

    // Find exact match by title
    const publishedApp = data.value.find(app => app.title === appName);
    return publishedApp?.systemName || null;
  }

  private async deployNewApp(appName: string, systemName: string, envConfig: EnvironmentConfig): Promise<string> {
    const endpoint = API_ENDPOINTS.DEPLOY_APP.replace('{systemName}', systemName);
    const url = `${envConfig.baseUrl}/${envConfig.orgId}${endpoint}`;

    const payload = {
      title: appName,
      routingName: appName
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders({
        bearerToken: envConfig.accessToken,
        tenantId: envConfig.tenantId,
        folderKey: envConfig.folderKey,
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
    }

    const data = await response.json() as DeployResponse;
    return data.id;
  }

  private async upgradeApp(deploymentId: string, envConfig: EnvironmentConfig): Promise<void> {
    const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.UPGRADE_APP}`;

    const payload = {
      deploymentIds: [deploymentId],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders({
        bearerToken: envConfig.accessToken,
        tenantId: envConfig.tenantId,
        folderKey: envConfig.folderKey,
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_UPGRADE);
    }
  }

  private async updateAppConfig(deploymentId: string): Promise<void> {
    const configDir = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
    const configPath = path.join(configDir, AUTH_CONSTANTS.FILES.APP_CONFIG);

    try {
      // Load existing config (should exist from register step)
      const config = this.loadAppConfig() || {} as AppConfig;

      // Update with deployment info
      config.deploymentId = deploymentId;
      config.deployedAt = new Date().toISOString();

      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write atomically to avoid race conditions
      atomicWriteFileSync(configPath, config);

    } catch (error) {
      this.warn(`${MESSAGES.ERRORS.FAILED_TO_SAVE_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`);
    }
  }
}
