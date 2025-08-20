import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { EnvironmentConfig, AppConfig } from '../../types/index.js';
import { API_ENDPOINTS } from '../../constants/index.js';
import { createHeaders, buildAppUrl } from '../../utils/api.js';
import { validateEnvironment } from '../../utils/env-validator.js';

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
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(RegisterApp);
    
    this.log(chalk.blue('🚀 UiPath App Registration'));

    // Validate environment variables
    const envConfig = await this.validateEnvironment();
    if (!envConfig) {
      return;
    }

    // Get app details
    const appName = flags.name || await this.promptForAppName();
    const appVersion = flags.version;

    // Register the app
    await this.registerApp(appName, appVersion, envConfig);
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
        message: 'Enter app name:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'App name is required';
          }
          return true;
        },
      },
    ]);
    
    return response.name;
  }

  private async registerApp(appName: string, appVersion: string, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora('Registering app with UiPath...').start();
    
    try {
      // Call the publish coded app API
      const response = await this.publishAppToUiPath(appName, appVersion, envConfig);
      
      // Extract the systemName from the response
      const appSystemName = response.definition.systemName;
      
      // Construct the app URL
      const folderKey = envConfig.folderKey!; // We know this is defined because validateEnvironment checks for it
      const appUrl = buildAppUrl(envConfig.baseUrl, envConfig.orgId, envConfig.tenantId, folderKey, appSystemName);
      
      // Save app configuration
      const appConfig: AppConfig = {
        appName,
        appVersion,
        systemName: appSystemName,
        appUrl,
        registeredAt: new Date().toISOString(),
      };
      await this.saveAppConfig(appConfig);
      
      // Update .env file with the redirect URL
      await this.updateEnvFile('UIPATH_APP_URL', appUrl);
      await this.updateEnvFile('UIPATH_APP_REDIRECT_URI', appUrl);
      
      spinner.succeed(chalk.green('✅ App registered successfully!'));
      
      this.log('');
      this.log(chalk.bold('App Details:'));
      this.log(`  ${chalk.cyan('Name:')} ${appName}`);
      this.log(`  ${chalk.cyan('Version:')} ${appVersion}`);
      this.log(`  ${chalk.cyan('System Name:')} ${appSystemName}`);
      this.log('');
      this.log(chalk.bold('App URL:'));
      this.log(`  ${chalk.green(appUrl)}`);
      this.log('');
      this.log(chalk.blue('🎉 Your app has been registered with UiPath!'));
      this.log(chalk.yellow('💡 The app URL has been saved to your .env file as UIPATH_APP_URL and UIPATH_APP_REDIRECT_URI'));
      this.log(chalk.yellow('💡 App configuration has been saved and will be used by pack command'));
      this.log(chalk.yellow('💡 You can use this URL as the redirect URI for OAuth configuration in your SDK'));
      this.log('');
      this.log(chalk.dim('Next steps:'));
      this.log(chalk.dim('1. Build your application: npm run build'));
      this.log(chalk.dim('2. Package your application: uipath pack ./dist'));
      this.log(chalk.dim('   (App name and version will be automatically used from registration)'));
      this.log(chalk.dim('3. Publish the package: uipath publish'));
      
    } catch (error) {
      spinner.fail(chalk.red('❌ App registration failed'));
      this.error(`Registration error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async publishAppToUiPath(packageName: string, packageVersion: string, envConfig: EnvironmentConfig): Promise<RegisterResponse> {
    const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.PUBLISH_CODED_APP}`;
    
    const payload = {
      tenantName: envConfig.tenantName,
      packageName: packageName,
      packageVersion: packageVersion,
      title: packageName,
      schema: {}
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: createHeaders(envConfig),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
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
      this.warn(`Failed to save app configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      this.warn(`Failed to update .env file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.log(chalk.yellow(`Please add the following to your .env file manually:`));
      this.log(chalk.dim(`${key}=${value}`));
    }
  }
}