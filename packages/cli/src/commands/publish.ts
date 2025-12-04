import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { EnvironmentConfig } from '../types/index.js';
import { API_ENDPOINTS, AUTH_CONSTANTS } from '../constants/index.js';
import { MESSAGES } from '../constants/messages.js';
import { validateEnvironment } from '../utils/env-validator.js';
import { handleHttpError } from '../utils/error-handler.js';
import { track } from '../telemetry/index.js';

export default class Publish extends Command {
  static override description = 'Publish NuGet packages to UiPath Orchestrator';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --uipathDir ./packages',
    '<%= config.bin %> <%= command.id %> --orgId abc123 --tenantId xyz789 --tenantName MyTenant --authToken your_token',
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
      description: 'UiPath tenant name',
    }),
    authToken: Flags.string({
      description: 'UiPath authentication token',
    }),
  };

  @track('Publish')
  public async run(): Promise<void> {
    const { flags } = await this.parse(Publish);

    this.log(chalk.blue(MESSAGES.INFO.PUBLISHER));

    // Validate environment variables or flags
    const envConfig = await this.validateEnvironment(flags);
    if (!envConfig) {
      return;
    }

    await this.publishPackage(flags, envConfig);
  }

  private async validateEnvironment(flags: any): Promise<EnvironmentConfig | null> {
    const requiredEnvVars = [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID',
      'UIPATH_TENANT_ID',
      'UIPATH_TENANT_NAME',
      'UIPATH_BEARER_TOKEN'
    ];

    // Build config from flags (takes precedence over env vars)
    const flagConfig: Partial<EnvironmentConfig> = {};
    if (flags.baseUrl) flagConfig.baseUrl = flags.baseUrl;
    if (flags.orgId) flagConfig.orgId = flags.orgId;
    if (flags.tenantId) flagConfig.tenantId = flags.tenantId;
    if (flags.tenantName) flagConfig.tenantName = flags.tenantName;
    if (flags.authToken) flagConfig.bearerToken = flags.authToken;

    const result = validateEnvironment(requiredEnvVars, this, flagConfig);
    return result.isValid ? result.config! : null;
  }

  private async publishPackage(flags: any, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora(MESSAGES.INFO.PUBLISHING_PACKAGE).start();
    
    try {
      // Check if .uipath directory exists
      if (!fs.existsSync(flags.uipathDir)) {
        spinner.fail(chalk.red(`${MESSAGES.ERRORS.UIPATH_DIR_NOT_FOUND}`));
        this.log('');
        this.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
        return;
      }

      // Find .nupkg files
      const nupkgFiles = fs.readdirSync(flags.uipathDir)
        .filter(file => file.endsWith('.nupkg'))
        .map(file => path.join(flags.uipathDir, file));

      if (nupkgFiles.length === 0) {
        spinner.fail(chalk.red(`${MESSAGES.ERRORS.NO_NUPKG_FILES_FOUND}`));
        this.log('');
        this.log(chalk.yellow(MESSAGES.INFO.RUN_PACK_FIRST));
        return;
      }

      let selectedPackage: string;

      if (nupkgFiles.length === 1) {
        selectedPackage = nupkgFiles[0];
        spinner.text = `Publishing ${path.basename(selectedPackage)}...`;
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
        spinner.start(`Publishing ${path.basename(selectedPackage)}...`);
      }

      // Upload package using multipart form data
      await this.uploadPackage(selectedPackage, envConfig);
      
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.PACKAGE_PUBLISHED_SUCCESS));
      this.log('');
      this.log(chalk.blue(MESSAGES.INFO.PACKAGE_AVAILABLE));
      
    } catch (error) {
      spinner.fail(chalk.red(`${MESSAGES.ERRORS.PACKAGE_PUBLISHING_FAILED}`));
      this.log(chalk.red(`${MESSAGES.ERRORS.PUBLISHING_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }


  private async uploadPackage(packagePath: string, envConfig: EnvironmentConfig): Promise<void> {
    const form = new FormData();
    form.append('uploads[]', fs.createReadStream(packagePath));

    const url = `${envConfig.baseUrl}/${envConfig.orgId}/${envConfig.tenantId}${API_ENDPOINTS.UPLOAD_PACKAGE}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${envConfig.bearerToken}`,
        ...form.getHeaders(),
      },
      body: form,
    });
    if (!response.ok) {
      await handleHttpError(response, 'package publishing');
    }

    // Validate that we got a proper API response, not HTML
    const contentType = response.headers.get(AUTH_CONSTANTS.CORS.VALUES.HEADERS);
    if (contentType && contentType.includes(AUTH_CONSTANTS.CONTENT_TYPES.TEXT_HTML)) {
      // We got HTML instead of JSON - this means the endpoint doesn't exist or auth failed
      const responseText = await response.text();
      throw new Error(`${MESSAGES.ERRORS.PACKAGE_UPLOAD_FAILED} ${responseText}`);
    }
  }

}