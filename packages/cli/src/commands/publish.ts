import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora, { Ora } from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { EnvironmentConfig, AppConfig } from '../types/index.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { getEnvironmentConfig, atomicWriteFileSync } from '../utils/env-config.js';
import { createHeaders } from '../utils/api.js';
import { handleHttpError } from '../utils/error-handler.js';
import { track } from '../telemetry/index.js';

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

export default class Publish extends Command {
  static override description = 'Publish NuGet packages to UiPath Orchestrator';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --uipathDir ./packages',
    "<%= config.bin %> <%= command.id %> --orgId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantId 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' --tenantName 'MyTenant' --accessToken 'your_token'",
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    uipathDir: Flags.string({
      description: 'UiPath directory containing packages',
      default: './.uipath',
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
    tenantName: Flags.string({
      description: 'UiPath tenant name (required for coded app registration)',
    }),
    accessToken: Flags.string({
      description: 'UiPath authentication token',
    }),
  };

  @track('Publish')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Publish);

    this.log(chalk.blue(MESSAGES.INFO.PUBLISHER));

    // Validate environment variables or flags
    const envConfig = getEnvironmentConfig(AUTH_CONSTANTS.REQUIRED_ENV_VARS.PUBLISH, this, flags);
    if (!envConfig) {
      process.exit(1);
    }

    await this.publishPackage(flags.uipathDir, envConfig);
  }

  private async publishPackage(uipathDir: string, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora(MESSAGES.INFO.PUBLISHING_PACKAGE).start();

    try {
      // Check if .uipath directory exists
      if (!fs.existsSync(uipathDir)) {
        spinner.fail(chalk.red(`${MESSAGES.ERRORS.UIPATH_DIR_NOT_FOUND}`));
        this.log('');
        this.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
        process.exit(1);
      }

      // Find .nupkg files
      const nupkgFiles = fs.readdirSync(uipathDir)
        .filter(file => file.endsWith('.nupkg'))
        .map(file => path.join(uipathDir, file));

      if (nupkgFiles.length === 0) {
        spinner.fail(chalk.red(`${MESSAGES.ERRORS.NO_NUPKG_FILES_FOUND}`));
        this.log('');
        this.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
        process.exit(1);
      }

      let selectedPackage: string;

      if (nupkgFiles.length === 1) {
        selectedPackage = nupkgFiles[0];
      } else {
        spinner.stop();
        const response = await inquirer.prompt([
          {
            type: 'list',
            name: 'package',
            message: MESSAGES.PROMPTS.SELECT_PACKAGE_TO_PUBLISH,
            choices: nupkgFiles.map(file => ({
              name: path.basename(file),
              value: file,
            })),
          },
        ]);
        selectedPackage = response.package;
        spinner.start();
      }

      // Extract package metadata from filename
      const metadata = this.extractPackageMetadata(selectedPackage);

      // Step 1: Upload package to Orchestrator
      spinner.text = MESSAGES.INFO.UPLOADING_PACKAGE;
      await this.uploadPackage(selectedPackage, envConfig, spinner);
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.PACKAGE_UPLOADED_SUCCESS));

      // Step 2: Register coded app
      spinner.start(MESSAGES.INFO.REGISTERING_CODED_APP);
      const registerResponse = await this.registerCodedApp(metadata, envConfig);
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.CODED_APP_REGISTERED_SUCCESS));

      // Step 3: Save app configuration
      await this.saveAppConfig({
        appName: metadata.packageName,
        appVersion: metadata.packageVersion,
        systemName: registerResponse.definition.systemName,
        appUrl: null, // App URL is now injected at deployment time
        registeredAt: new Date().toISOString(),
      });

      this.log('');
      this.log(chalk.bold('Published App Details:'));
      this.log(`  ${chalk.cyan('Name:')} ${metadata.packageName}`);
      this.log(`  ${chalk.cyan('Version:')} ${metadata.packageVersion}`);
      this.log(`  ${chalk.cyan('System Name:')} ${registerResponse.definition.systemName}`);
      if (registerResponse.deployVersion) {
        this.log(`  ${chalk.cyan('Deploy Version:')} ${registerResponse.deployVersion}`);
      }
      this.log('');
      this.log(chalk.blue(MESSAGES.INFO.PACKAGE_AVAILABLE));

    } catch (error) {
      spinner.fail(chalk.red(`${MESSAGES.ERRORS.PACKAGE_PUBLISHING_FAILED}`));
      this.log(chalk.red(`${MESSAGES.ERRORS.PUBLISHING_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }

  /**
   * Extract package name and version from .nupkg filename
   * Filename format: {packageName}.{version}.nupkg
   * Example: MyApp.1.0.0.nupkg -> { packageName: 'MyApp', packageVersion: '1.0.0' }
   */
  private extractPackageMetadata(packagePath: string): PackageMetadata {
    const filename = path.basename(packagePath, '.nupkg');

    // NuGet package naming convention: {id}.{version}
    // Version typically follows semantic versioning: major.minor.patch[-prerelease]
    // We need to find where the version starts (first numeric segment after a dot)
    const parts = filename.split('.');

    // Find the index where the version starts
    // Version starts when we see a numeric part
    let versionStartIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      if (/^\d+$/.test(parts[i])) {
        versionStartIndex = i;
        break;
      }
    }

    if (versionStartIndex <= 0) {
      // Fallback: assume last 3 parts are version (x.y.z)
      versionStartIndex = parts.length - 3;
    }

    const packageName = parts.slice(0, versionStartIndex).join('.');
    const packageVersion = parts.slice(versionStartIndex).join('.');

    return { packageName, packageVersion };
  }


  private async uploadPackage(packagePath: string, envConfig: EnvironmentConfig, spinner: Ora): Promise<void> {
    const form = new FormData();
    form.append('uploads[]', fs.createReadStream(packagePath));

    const url = `${envConfig.baseUrl}/${envConfig.orgId}/${envConfig.tenantId}${API_ENDPOINTS.UPLOAD_PACKAGE}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${envConfig.accessToken}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    // Handle 409 Conflict with errorCode 1004 (Package already exists)
    if (response.status === AUTH_CONSTANTS.HTTP_STATUS.CONFLICT) {
      try {
        const errorBody = await response.json() as { errorCode?: number; message?: string };
        if (errorBody.errorCode === AUTH_CONSTANTS.ERROR_CODES.PACKAGE_ALREADY_EXISTS) {
          // Package already exists - this is OK for retry scenario
          spinner.info(chalk.yellow(MESSAGES.INFO.PACKAGE_ALREADY_EXISTS));
          spinner.start();
          return;
        }
      } catch {
        // If we can't parse the error body, fall through to the generic error handler
      }
    }

    if (!response.ok) {
      await handleHttpError(response, MESSAGES.ERROR_CONTEXT.PACKAGE_PUBLISHING);
    }

    // Validate that we got a proper API response, not HTML
    const contentType = response.headers.get(AUTH_CONSTANTS.CORS.VALUES.HEADERS);
    if (contentType && contentType.includes(AUTH_CONSTANTS.CONTENT_TYPES.TEXT_HTML)) {
      // We got HTML instead of JSON - this means the endpoint doesn't exist or auth failed
      const responseText = await response.text();
      throw new Error(`${MESSAGES.ERRORS.PACKAGE_UPLOAD_FAILED} ${responseText}`);
    }
  }

  /**
   * Register the coded app with UiPath by calling the codedapp/publish API
   */
  private async registerCodedApp(metadata: PackageMetadata, envConfig: EnvironmentConfig): Promise<RegisterResponse> {
    const url = `${envConfig.baseUrl}/${envConfig.orgId}${API_ENDPOINTS.PUBLISH_CODED_APP}`;

    const payload = {
      tenantName: envConfig.tenantName,
      packageName: metadata.packageName,
      packageVersion: metadata.packageVersion,
      title: metadata.packageName,
      schema: {},
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

    return await response.json() as RegisterResponse;
  }

  /**
   * Save app configuration to .uipath/app.config.json
   */
  private async saveAppConfig(config: AppConfig): Promise<void> {
    const configDir = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR);
    const configPath = path.join(configDir, AUTH_CONSTANTS.FILES.APP_CONFIG);

    try {
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