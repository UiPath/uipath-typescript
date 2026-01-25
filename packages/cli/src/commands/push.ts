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
  ];

  static override args = {
    'project-id': Args.string({
      description: 'WebApp Project ID (solution ID). Can also be set via UIPATH_PROJECT_ID environment variable.',
      required: false,
    }),
  };

  static override flags = {
    help: Flags.help({ char: 'h' }),
    'ignore-resources': Flags.boolean({
      description: 'Skip importing the referenced resources to Studio Web solution',
      default: false,
    }),
  };

  @track('Push')
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Push);
    
    this.log(chalk.blue('🚀 UiPath WebApp Push'));
    this.log('');

    // Validate environment variables
    const envConfig = await this.validateEnvironment();
    if (!envConfig) {
      return;
    }

    // Get project ID from args, env var, or error
    const projectId = args['project-id'] || process.env.UIPATH_PROJECT_ID;
    if (!projectId) {
      this.log(chalk.red('❌ Project ID is required'));
      this.log(chalk.yellow('💡 Provide it as:'));
      this.log(chalk.yellow('   - Positional argument: uipath push <project-id>'));
      this.log(chalk.yellow('   - Environment variable: UIPATH_PROJECT_ID'));
      this.log('');
      return;
    }

    // Auto-detect root directory (current working directory)
    const rootDir = process.cwd();
    this.log(chalk.gray(`📁 Working directory: ${rootDir}`));

    // Auto-detect dist folder
    const distPath = path.join(rootDir, 'dist');
    if (!fs.existsSync(distPath) || !fs.statSync(distPath).isDirectory()) {
      this.log(chalk.red(`❌ dist/ directory not found at ${distPath}`));
      this.log(chalk.yellow('💡 Make sure you are in your project root directory with a dist/ folder'));
      this.log('');
      return;
    }
    this.log(chalk.gray(`📦 Found dist/ folder: ${distPath}`));

    // Auto-detect bindings.json (optional, but log if found)
    const bindingsPath = path.join(rootDir, 'bindings.json');
    if (fs.existsSync(bindingsPath)) {
      this.log(chalk.gray(`📋 Found bindings.json: ${bindingsPath}`));
    } else {
      this.log(chalk.gray(`ℹ️  bindings.json not found (resource import will be skipped)`));
    }

    // Validate preconditions
    try {
      Preconditions.validate(rootDir);
    } catch (error) {
      this.log(chalk.red(`❌ Precondition validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
      this.log('');
      return;
    }

    // Create handler and push
    const handler = new WebAppFileHandler({
      projectId,
      rootDir,
      bundlePath: 'dist',
      manifestFile: '.uipath/studio_metadata.json',
      envConfig,
      logger: this,
    });

    try {
      await handler.push();
      
      // Import referenced resources (unless --ignore-resources flag is set)
      await handler.importReferencedResources(flags['ignore-resources']);
      
      this.log('');
      this.log(chalk.green('✅ WebApp push completed successfully!'));
    } catch (error) {
      this.log('');
      this.log(chalk.red(`❌ WebApp push failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
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
