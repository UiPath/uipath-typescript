import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { EnvironmentConfig, AppConfig, AppType } from '../../types/index.js';
import { ACTION_SCHEMA_CONSTANTS, API_ENDPOINTS } from '../../constants/index.js';
import { MESSAGES } from '../../constants/messages.js';
import { createHeaders, buildAppUrl } from '../../utils/api.js';
import { validateEnvironment } from '../../utils/env-validator.js';
import { handleHttpError } from '../../utils/error-handler.js';
import { track } from '../../telemetry/index.js';
import { readAndParseActionSchema } from '../../utils/action-schema.js';

interface RegisterResponse {
  definition: {
    systemName: string;
  };
}


export default class RegisterApp extends Command {
  static override description = 'Register app with UiPath and get the app URL for OAuth configuration';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --name MyApp',
    '<%= config.bin %> <%= command.id %> --name MyApp --version 1.0.0',
    '<%= config.bin %> <%= command.id %> --name MyApp --version 1.0.0 --type Action',
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'App name',
    }),
    version: Flags.string({
      char: 'v',
      description: 'App version',
      default: '1.0.0',
    }),
    type: Flags.string({
      char: 't',
      description: 'App Type',
      default: AppType.Web,
      options: [AppType.Web, AppType.Action]
    })
  };

  @track('RegisterApp')
  public async run(): Promise<void> {
    const { flags } = await this.parse(RegisterApp);
    
    this.log(chalk.blue(MESSAGES.INFO.APP_REGISTRATION));

    // Validate environment variables
    const envConfig = await this.validateEnvironment();
    if (!envConfig) {
      return;
    }

    // Get app details
    const appName = flags.name || await this.promptForAppName();
    const appVersion = flags.version;
    const isActionApp = flags.type as AppType === AppType.Action;

    if (isActionApp && !fs.existsSync(path.join(process.cwd(), ACTION_SCHEMA_CONSTANTS.ACTION_SCHEMA_FILENAME))) {
      this.log(chalk.red(`${MESSAGES.ERRORS.ACTION_SCHEMA_REQUIRED}`));
      this.log(chalk.yellow(MESSAGES.INFO.CREATE_ACTION_SCHEMA_FIRST));
      return;
    }

    // Register the app
    await this.registerApp(appName, appVersion, isActionApp, envConfig);
  }

  private async validateEnvironment(): Promise<EnvironmentConfig | null> {
    const requiredEnvVars = [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID', 
      'UIPATH_TENANT_ID',
      'UIPATH_TENANT_NAME',
      'UIPATH_FOLDER_KEY',
      'UIPATH_BEARER_TOKEN'
    ];

    const result = validateEnvironment(requiredEnvVars, this);
    
    return result.isValid ? result.config! : null;
  }

  private async promptForAppName(): Promise<string> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: MESSAGES.PROMPTS.ENTER_APP_NAME,
        validate: (input: string) => {
          if (!input.trim()) {
            return MESSAGES.VALIDATIONS.APP_NAME_REQUIRED;
          }
          return true;
        },
      },
    ]);
    
    return response.name;
  }

  private async registerApp(appName: string, appVersion: string, isActionApp: boolean, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora(MESSAGES.INFO.REGISTERING_APP).start();
    
    try {
      // Call the publish coded app API
      const response = await this.publishAppToUiPath(appName, appVersion, isActionApp, envConfig);
      
      // Extract the systemName from the response
      const appSystemName = response.definition.systemName;
      
      // Construct the app URL
      const folderKey = envConfig.folderKey!; // We know this is defined because validateEnvironment checks for it
      const appUrl = isActionApp ? null : buildAppUrl(envConfig.baseUrl, envConfig.orgId, envConfig.tenantId, folderKey, appSystemName);
      
      // Save app configuration
      const appConfig: AppConfig = {
        appName,
        appVersion,
        systemName: appSystemName,
        appUrl,
        registeredAt: new Date().toISOString(),
      };
      await this.saveAppConfig(appConfig);
      
      if (!isActionApp) {
        // Update .env file with the redirect URL
        await this.updateEnvFile('UIPATH_APP_URL', appUrl!);
        await this.updateEnvFile('UIPATH_APP_REDIRECT_URI', appUrl!);
      }
      
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.APP_REGISTERED_SUCCESS));
      
      this.log('');
      this.log(chalk.bold('App Details:'));
      this.log(`  ${chalk.cyan('Name:')} ${appName}`);
      this.log(`  ${chalk.cyan('Version:')} ${appVersion}`);
      this.log(`  ${chalk.cyan('System Name:')} ${appSystemName}`);
      this.log('');
      if (!isActionApp) {
        this.log(chalk.bold('App URL:'));
        this.log(`  ${chalk.green(appUrl)}`);
        this.log('');
      }
      this.log(chalk.blue(MESSAGES.INFO.APP_REGISTERED));
      if (isActionApp) {
        this.log(chalk.yellow(MESSAGES.INFO.NO_APP_URL_FOR_ACTION_APP));
      }
      else {
        this.log(chalk.yellow(MESSAGES.INFO.APP_URL_SAVED_TO_ENV));
      }
      this.log(chalk.yellow(MESSAGES.INFO.APP_CONFIG_SAVED));
      if (!isActionApp) {
        this.log(chalk.yellow(MESSAGES.INFO.URL_FOR_OAUTH_CONFIG));
      }
      this.log('');
      this.log(chalk.dim(MESSAGES.INFO.NEXT_STEPS));
      this.log(chalk.dim(MESSAGES.INFO.STEP_BUILD_APP));
      this.log(chalk.dim(MESSAGES.INFO.STEP_PACKAGE_APP));
      this.log(chalk.dim(MESSAGES.INFO.STEP_PACKAGE_NOTE));
      this.log(chalk.dim(MESSAGES.INFO.STEP_PUBLISH_PACKAGE));
      
    } catch (error) {
      spinner.fail(chalk.red(`${MESSAGES.ERRORS.APP_REGISTRATION_FAILED}`));
      this.log(chalk.red(`${MESSAGES.ERRORS.REGISTRATION_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }

  private async publishAppToUiPath(packageName: string, packageVersion: string, isActionApp: boolean, envConfig: EnvironmentConfig): Promise<RegisterResponse> {
    const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.PUBLISH_CODED_APP}`;
    let actionSchema;
    if (isActionApp) {
      try {
        actionSchema = readAndParseActionSchema();
      } catch (error) {
        this.log('')
        this.log(chalk.red(`${MESSAGES.ERRORS.FAILED_TO_PARSE_ACTION_SCHEMA} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
        process.exit(1);
      }
    }

    const payload = {
      tenantName: envConfig.tenantName,
      packageName: packageName,
      packageVersion: packageVersion,
      title: packageName,
      schema: isActionApp ? actionSchema : {},
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders({ 
        bearerToken: envConfig.bearerToken,
        tenantId: envConfig.tenantId 
      }),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      await handleHttpError(response, 'app registration');
    }

    return await response.json() as RegisterResponse;
  }

  private async saveAppConfig(config: AppConfig): Promise<void> {
    const configDir = path.join(process.cwd(), '.uipath');
    const configPath = path.join(configDir, 'app.config.json');
    
    try {
      // Ensure directory exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Write atomically to avoid race conditions
      const tempPath = `${configPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(config, null, 2));
      fs.renameSync(tempPath, configPath);
      
    } catch (error) {
      this.warn(`${MESSAGES.ERRORS.FAILED_TO_SAVE_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`);
    }
  }

  private async updateEnvFile(key: string, value: string): Promise<void> {
    const envPath = path.join(process.cwd(), '.env');
    
    try {
      let envContent = '';
      
      // Read file contents
      try {
        envContent = fs.readFileSync(envPath, 'utf-8');
      } catch (error) {
        // File doesn't exist, that's ok
      }
      
      // Check if the key already exists
      const keyRegex = new RegExp(`^${key}=.*$`, 'm');
      
      if (keyRegex.test(envContent)) {
        // Update existing key
        envContent = envContent.replace(keyRegex, `${key}=${value}`);
      } else {
        // Add new key
        if (envContent && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `${key}=${value}\n`;
      }
      
      // Write atomically to avoid race conditions
      const tempPath = `${envPath}.tmp`;
      fs.writeFileSync(tempPath, envContent);
      fs.renameSync(tempPath, envPath);
      
    } catch (error) {
      this.warn(`${MESSAGES.ERRORS.FAILED_TO_UPDATE_ENV} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`);
      this.log(chalk.yellow(MESSAGES.ERRORS.MANUAL_ENV_INSTRUCTION));
      this.log(chalk.dim(`${key}=${value}`));
    }
  }
}