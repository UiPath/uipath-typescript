import { Command, Args, Flags } from '@oclif/core';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';
import { EnvironmentConfig } from '../types/index.js';
import { validateEnvironment } from '../utils/env-config.js';
import { WebAppFileHandler } from '../core/webapp-file-handler.js';
import { Preconditions } from '../core/preconditions.js';
import { track } from '../telemetry/index.js';

export default class Push extends Command {
  static override description = 'Push local web app build to remote WebApp Project (atomic sync)';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> <project-id>',
    '<%= config.bin %> <%= command.id %> <project-id> --ignore-resources',
    '<%= config.bin %> <%= command.id %> <project-id> --build-dir build',
  ];

  static override args = {
    'project-id': Args.string({
      description: 'WebApp Project ID (solution ID). Can also be set via UIPATH_PROJECT_ID environment variable.',
      required: false,
    }),
  };

  static override flags = {
    help: Flags.help({ char: 'h' }),
    'build-dir': Flags.string({
      description: 'Relative path to the build output directory (e.g. dist, build, out). Default: dist',
      default: 'dist',
    }),
    'ignore-resources': Flags.boolean({
      description: 'Skip importing the referenced resources to Studio Web solution',
      default: false,
    }),
  };

  @track('Push')
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Push);

    this.log(chalk.blue('🚀 UiPath Push'));
    this.log('');

    const envConfig = await this.validateEnvironment();
    if (!envConfig) return;

    const projectId = args['project-id'] || process.env.UIPATH_PROJECT_ID;
    if (!projectId) {
      this.log(chalk.red('Project ID is required. Use: uipath push <project-id> or set UIPATH_PROJECT_ID in the .env file and use uipath push directly'));
      return;
    }

    const rootDir = process.cwd();
    const bundlePath = flags['build-dir'].replace(/^\.\//, '').replace(/\\/g, '/') || 'dist';
    const buildPath = path.join(rootDir, bundlePath);
    if (!fs.existsSync(buildPath) || !fs.statSync(buildPath).isDirectory()) {
      this.log(chalk.red(`Build directory '${bundlePath}' not found at ${buildPath}. Run from project root with a valid build folder.`));
      return;
    }

    try {
      Preconditions.validate(rootDir, bundlePath);
    } catch (error) {
      this.log(chalk.red(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      return;
    }

    const handler = new WebAppFileHandler({
      projectId,
      rootDir,
      bundlePath,
      manifestFile: '.uipath/studio_metadata.json',
      envConfig,
      logger: this,
    });

    try {
      await handler.push();
      await handler.importReferencedResources(flags['ignore-resources']);
      this.log(chalk.green('Push completed successfully.'));
    } catch (error) {
      this.log(chalk.red(`Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  }

  private async validateEnvironment(): Promise<EnvironmentConfig | null> {
    const requiredEnvVars = [
      'UIPATH_BASE_URL',
      'UIPATH_ORG_ID',
      'UIPATH_TENANT_ID',
      'UIPATH_TENANT_NAME',
      'UIPATH_ACCESS_TOKEN',
    ] as const;

    const result = validateEnvironment(requiredEnvVars, this);
    return result.isValid ? result.config! : null;
  }
}
