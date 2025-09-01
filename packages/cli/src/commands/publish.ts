import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { EnvironmentConfig } from '../types/index.js';
import { API_ENDPOINTS } from '../constants/index.js';
import { validateEnvironment } from '../utils/env-validator.js';

export default class Publish extends Command {
  static override description = 'Publish NuGet packages to UiPath Orchestrator';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ];

  static override flags = {
    help: Flags.help({ char: 'h' }),
    'uipath-dir': Flags.string({
      description: 'UiPath directory containing packages',
      default: './.uipath',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Publish);
    
    this.log(chalk.blue('🚀 UiPath Publisher'));

    // Validate environment variables
    const envConfig = await this.validateEnvironment();
    if (!envConfig) {
      return;
    }

    await this.publishPackage(flags, envConfig);
  }

  private async validateEnvironment(): Promise<EnvironmentConfig | null> {
    const requiredEnvVars = [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID', 
      'UIPATH_TENANT_ID',
      'UIPATH_TENANT_NAME',
      'UIPATH_BEARER_TOKEN'
    ];

    const result = validateEnvironment(requiredEnvVars, this);
    return result.isValid ? result.config! : null;
  }

  private async publishPackage(flags: any, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora('Publishing package to UiPath Orchestrator...').start();
    
    try {
      // Check if .uipath directory exists
      if (!fs.existsSync(flags['uipath-dir'])) {
        spinner.fail(chalk.red('❌ .uipath directory not found'));
        this.log('');
        this.log(chalk.yellow('💡 Run "uipath pack" first to create a package'));
        return;
      }

      // Find .nupkg files
      const nupkgFiles = fs.readdirSync(flags['uipath-dir'])
        .filter(file => file.endsWith('.nupkg'))
        .map(file => path.join(flags['uipath-dir'], file));

      if (nupkgFiles.length === 0) {
        spinner.fail(chalk.red('❌ No .nupkg files found'));
        this.log('');
        this.log(chalk.yellow('💡 Run "uipath pack" first to create a package'));
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
            message: 'Select package to publish:',
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
      
      spinner.succeed(chalk.green('✅ Package published successfully!'));
      this.log('');
      this.log(chalk.blue('🎉 Package is now available in UiPath Orchestrator'));
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Package publishing failed'));
      this.error(`Publishing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

}