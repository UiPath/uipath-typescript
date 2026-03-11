import { Command, Flags, Args } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import { MESSAGES, MESSAGE_BUILDERS } from '../constants/messages.js';
import { AppConfig, SdkConfig, EnvironmentConfig, AppType } from '../types/index.js';
import { AUTH_CONSTANTS, DEFAULT_APP_VERSION, API_ENDPOINTS } from '../constants/index.js';
import { sanitizeAppName, getEnvironmentConfig } from '../utils/env-config.js';
import { track } from '../telemetry/index.js';
import { createHeaders } from '../utils/api.js';
import { handleHttpError } from '../utils/error-handler.js';

export default class Pack extends Command {
  static override description = 'Package UiPath projects as NuGet packages with metadata files (no external dependencies required)';

  static override examples = [
    '<%= config.bin %> <%= command.id %> ./dist',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp --version 1.0.0',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp --type Action',
    '<%= config.bin %> <%= command.id %> ./dist --output ./.uipath',
    '<%= config.bin %> <%= command.id %> ./dist --dry-run',
    '<%= config.bin %> <%= command.id %> ./dist --name MyApp --orgId \'xxxx\' --tenantId \'xxxx\' --folderKey \'xxxx\' --accessToken \'your_token\'',
    '<%= config.bin %> <%= command.id %> ./dist --name MyActionApp --type Action --orgId \'xxxx\' --tenantId \'xxxx\' --folderKey \'xxxx\' --accessToken \'your_token\'',
  ];

  static override args = {
    dist: Args.string({
      description: 'Path to the dist folder containing built application',
      required: true,
    }),
  };

  static override flags = {
    help: Flags.help({ char: 'h' }),
    name: Flags.string({
      char: 'n',
      description: 'Package name (will be sanitized for NuGet)',
      required: false,
    }),
    version: Flags.string({
      char: 'v',
      description: 'Package version (semantic version)',
      default: DEFAULT_APP_VERSION,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory for the .nupkg package',
      default: './.uipath',
    }),
    author: Flags.string({
      char: 'a',
      description: 'Package author',
      default: 'UiPath Developer',
    }),
    description: Flags.string({
      description: 'Package description',
    }),
    'main-file': Flags.string({
      description: 'Main entry file (default: index.html)',
      default: 'index.html',
    }),
    'content-type': Flags.string({
      description: 'Content type (webapp, library, process)',
      default: 'webapp',
      options: ['webapp', 'library', 'process'],
    }),
    type: Flags.string({
      char: 't',
      description: 'App type (Web or Action)',
      default: AppType.Web,
      options: [AppType.Web, AppType.Action],
    }),
    'dry-run': Flags.boolean({
      description: 'Show what would be packaged without creating the package',
      default: false,
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
    folderKey: Flags.string({
      description: 'UiPath folder key',
    }),
    accessToken: Flags.string({
      description: 'UiPath bearer token for authentication',
    }),
  };

  @track('Pack')
  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Pack);

    this.log(chalk.blue(MESSAGES.INFO.PACKAGE_CREATOR));

    // Get dist directory from args
    const distDir = args.dist;

    // Validate dist directory
    if (!this.validateDistDirectory(distDir)) {
      this.log(chalk.red(`${MESSAGES.ERRORS.INVALID_DIST_DIRECTORY}: ${distDir}`));
      process.exit(1);
    }

    // Get package name from flag or prompt (NOT from appConfig as per user requirement)
    let packageName = flags.name;

    if (!packageName) {
      // No flag provided, so prompt
      packageName = await this.promptForPackageName();
    }

    // Ensure packageName is defined at this point
    if (!packageName) {
      this.log(chalk.red(MESSAGES.ERRORS.PACKAGE_NAME_REQUIRED));
      process.exit(1);
    }

    // Sanitize package name (warn instead of blocking)
    const { sanitized: sanitizedInput, wasModified } = sanitizeAppName(packageName);
    if (wasModified) {
      this.log(chalk.yellow(MESSAGE_BUILDERS.APP_NAME_SANITIZED(packageName, sanitizedInput)));
      packageName = sanitizedInput;
    }
    if (!packageName) {
      this.log(chalk.red(MESSAGES.ERRORS.PACKAGE_NAME_REQUIRED));
      process.exit(1);
    }

    // Get package version
    let version = flags.version;

    // Always need env config — for clientId validation (all cases) and name uniqueness (new apps)
    const envConfig = getEnvironmentConfig(AUTH_CONSTANTS.REQUIRED_ENV_VARS.DEPLOY, this, flags);
    if (!envConfig) {
      process.exit(1);
    }

    // Load or create uipath.json config
    const sdkConfig = await this.loadOrCreateSdkConfig();
    if (!sdkConfig) {
      process.exit(1);
    }

    const isActionApp = (flags.type as AppType) === AppType.Action;

    if (!isActionApp) {
      // clientId is mandatory for web apps
      if (!sdkConfig.clientId?.trim()) {
        this.log(chalk.red(MESSAGES.ERRORS.CLIENT_ID_REQUIRED));
        process.exit(1);
      }
      await this.validateClientId(sdkConfig.clientId, envConfig);
    } else if (sdkConfig.clientId?.trim()) {
      // clientId is optional for action apps, but validate it if provided
      await this.validateClientId(sdkConfig.clientId, envConfig);
    }

    // Only check app name uniqueness for new apps (version 1.0.0)
    // Skip for version upgrades (non-default versions)
    const isVersionUpgrade = version !== DEFAULT_APP_VERSION;

    if (!isVersionUpgrade) {
      // Check if app name is unique (only for new apps)
      await this.checkAppNameUniqueness(packageName, envConfig);
    }

    // Show info message about scope only when clientId is provided but scope is not
    if (!isVersionUpgrade && sdkConfig.clientId?.trim() && !sdkConfig.scope?.trim()) {
      this.log(chalk.blue(MESSAGES.INFO.SCOPE_NOT_PROVIDED_USING_CLIENT_SCOPES));
    }

    const sanitizedName = this.sanitizePackageName(packageName);

    // Get package description (use package name as default if not provided)
    const description = flags.description || packageName;

    const packageConfig = {
      distDir,
      name: sanitizedName,
      originalName: packageName,
      version,
      author: flags.author,
      description,
      mainFile: flags['main-file'],
      contentType: flags['content-type'],
      outputDir: flags.output,
      sdkConfig,
    };
    
    if (flags['dry-run']) {
      await this.showPackagePreview(packageConfig);
    } else {
      await this.createNuGetPackage(packageConfig);
    }
  }


  private async promptForPackageName(): Promise<string> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: MESSAGES.PROMPTS.ENTER_APP_NAME,
        validate: (input: string) => {
          if (!input.trim()) {
            return MESSAGES.VALIDATIONS.PACKAGE_NAME_REQUIRED;
          }
          return true;
        },
      },
    ]);

    return response.name;
  }

  private validateDistDirectory(distDir: string): boolean {
    if (!fs.existsSync(distDir)) {
      return false;
    }

    if (!fs.statSync(distDir).isDirectory()) {
      return false;
    }

    // Check if directory has files
    const files = fs.readdirSync(distDir);
    return files.length > 0;
  }

  private async loadOrCreateSdkConfig(): Promise<SdkConfig | null> {
    const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.SDK_CONFIG);

    if (fs.existsSync(configPath)) {
      return this.loadSdkConfig(configPath);
    }
    return this.createSdkConfig(configPath);
  }

  private loadSdkConfig(configPath: string): SdkConfig | null {
    let config: SdkConfig;
    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(content);
    } catch {
      this.log(chalk.red(MESSAGES.ERRORS.CONFIG_FILE_INVALID_JSON));
      return null;
    }

    return config;
  }

  private async createSdkConfig(configPath: string): Promise<SdkConfig | null> {
    const config: SdkConfig = {
      scope: '',
      clientId: '',
      orgName: '',
      tenantName: '',
      baseUrl: '',
      redirectUri: '',
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    this.log(chalk.yellow(MESSAGE_BUILDERS.SDK_CONFIG_CREATED(configPath)));
    this.log(chalk.yellow(`   ${MESSAGES.INFO.SDK_CONFIG_FILL_REQUIRED}`));

    return config;
  }

  private copyConfigToDistDirectory(config: { distDir: string; sdkConfig: SdkConfig }): void {
    const configDest = path.join(config.distDir, AUTH_CONSTANTS.FILES.SDK_CONFIG);
    // Always overwrite dist/uipath.json with the current project-root config
    fs.writeFileSync(configDest, JSON.stringify(config.sdkConfig, null, 2));
    this.log(chalk.green(MESSAGES.SUCCESS.CONFIG_FILE_INCLUDED));
  }

  private sanitizePackageName(name: string): string {
    // name has already been sanitized via sanitizeAppName; just remove any residual whitespace
    return name.replace(/\s+/g, '');
  }


  private async showPackagePreview(config: any): Promise<void> {
    this.log(chalk.yellow(MESSAGES.INFO.PACKAGE_PREVIEW));
    this.log('');
    
    this.log(`${chalk.bold('Package Name:')} ${config.name}`);
    this.log(`${chalk.bold('Original Name:')} ${config.originalName}`);
    this.log(`${chalk.bold('Version:')} ${config.version}`);
    this.log(`${chalk.bold('Author:')} ${config.author}`);
    this.log(`${chalk.bold('Description:')} ${config.description}`);
    this.log(`${chalk.bold('Content Type:')} ${config.contentType}`);
    this.log(`${chalk.bold('Main File:')} ${config.mainFile}`);
    this.log(`${chalk.bold('Dist Directory:')} ${config.distDir}`);
    this.log(`${chalk.bold('Output Directory:')} ${config.outputDir}`);
    
    this.log('');
    this.log(chalk.bold('Files to be created:'));
    this.log(`  - operate.json`);
    this.log(`  - bindings.json`);
    this.log(`  - bindings_v2.json`);
    this.log(`  - entry-points.json`);
    this.log(`  - package-descriptor.json`);
    this.log(`  - ${config.name}.${config.version}.nupkg (contains .nuspec and all content)`);
    
    this.log('');
    this.log(chalk.green(MESSAGES.SUCCESS.PACKAGE_CONFIG_VALIDATED));
    this.log(chalk.blue(MESSAGES.INFO.RUN_WITHOUT_DRY_RUN));
  }

  private async createNuGetPackage(config: any): Promise<void> {
    const spinner = ora(MESSAGES.INFO.CREATING_PACKAGE).start();

    try {
      // Ensure output directory exists
      if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
        this.log(chalk.dim(`${MESSAGES.INFO.CREATED_OUTPUT_DIRECTORY} ${config.outputDir}`));
      }

      // Copy uipath.json to dist directory (with clientId handling)
      this.copyConfigToDistDirectory(config);

      // Create metadata files in dist directory
      spinner.text = MESSAGES.INFO.CREATING_METADATA_FILES;
      await this.createMetadataFiles(config);
      
      // Create .nupkg using JSZip
      spinner.text = MESSAGES.INFO.CREATING_NUPKG_PACKAGE;
      await this.createNupkgFile(config);
      
      // Handle metadata.json
      await this.handleMetadataJson(config);
      
      spinner.succeed(chalk.green(MESSAGES.SUCCESS.PACKAGE_CREATED_SUCCESS));
      
      this.log('');
      this.log(`${chalk.bold('Package Details:')}`);
      this.log(`  Name: ${config.name}`);
      this.log(`  Version: ${config.version}`);
      this.log(`  Type: ${config.contentType}`);
      this.log(`  Location: ${path.join(config.outputDir, `${config.name}.${config.version}.nupkg`)}`);
      this.log('');
      this.log(chalk.blue(MESSAGES.INFO.PACKAGE_READY));
      this.log(chalk.dim(MESSAGES.INFO.USE_PUBLISH_TO_UPLOAD));
      
    } catch (error) {
      spinner.fail(chalk.red(`${MESSAGES.ERRORS.PACKAGE_CREATION_FAILED}`));
      this.log(chalk.red(`${MESSAGES.ERRORS.PACKAGING_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }

  private async createMetadataFiles(config: any): Promise<void> {
    await this.createOperateJson(config);
    await this.createBindingsJson(config, '1.0');
    await this.createBindingsJson(config, '2.0', '_v2');
    await this.createEntryPointsJson(config);
    await this.createPackageDescriptorJson(config);
  }

  private async createOperateJson(config: any): Promise<void> {
    const operateJson = {
      $schema: 'https://cloud.uipath.com/draft/2024-12/operate',
      projectId: uuidv4(),
      main: config.mainFile,
      contentType: config.contentType,
      targetFramework: 'Portable',
      runtimeOptions: {
        requiresUserInteraction: false,
        isAttended: false,
      },
      designOptions: {
        projectProfile: 'Development',
        outputType: config.contentType,
      },
    };

    const filePath = path.join(config.distDir, 'operate.json');
    fs.writeFileSync(filePath, JSON.stringify(operateJson, null, 2));
  }

  private async createBindingsJson(config: any, version: string, suffix: string = ''): Promise<void> {
    const bindingsJson = {
      version,
      resources: [],
    };

    const fileName = `bindings${suffix}.json`;
    const filePath = path.join(config.distDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(bindingsJson, null, 2));
  }

  private async createEntryPointsJson(config: any): Promise<void> {
    const entryPointsJson = {
      $schema: 'https://cloud.uipath.com/draft/2024-12/entry-point',
      $id: 'entry-points-doc-001',
      entryPoints: [
        {
          filePath: config.mainFile,
          uniqueId: uuidv4(),
          type: 'api',
          input: {
            amount: { type: 'integer' },
            id: { type: 'string' },
          },
          output: {
            status: { type: 'string' },
          },
        },
      ],
    };

    const filePath = path.join(config.distDir, 'entry-points.json');
    fs.writeFileSync(filePath, JSON.stringify(entryPointsJson, null, 2));
  }

  private async createPackageDescriptorJson(config: any): Promise<void> {
    const packageDescriptorJson = {
      $schema: 'https://cloud.uipath.com/draft/2024-12/package-descriptor',
      files: {
        'operate.json': 'content/operate.json',
        'entry-points.json': 'content/entry-points.json',
        'bindings.json': 'content/bindings_v2.json',
      },
    };

    const filePath = path.join(config.distDir, 'package-descriptor.json');
    fs.writeFileSync(filePath, JSON.stringify(packageDescriptorJson, null, 2));
  }

  private createNuspecContent(config: any): string {
    return `<?xml version="1.0"?>
<package>
  <metadata>
    <id>${config.name}</id>
    <version>${config.version}</version>
    <title>${config.name}</title>
    <authors>${config.author}</authors>
    <owners>UiPath</owners>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <description>${config.description}</description>
    <projectUrl>https://github.com/UiPath/uipath-typescript</projectUrl>
    <tags>uipath automation ${config.contentType}</tags>
  </metadata>
  <files>
    <file src="content/**/*" target="content/" />
  </files>
</package>`;
  }

  private async createNupkgFile(config: any): Promise<void> {
    const zip = new JSZip();
    
    // Add .nuspec file to package root
    const nuspecContent = this.createNuspecContent(config);
    zip.file(`${config.name}.nuspec`, nuspecContent);
    
    // Add all dist files to content/ folder recursively
    await this.addDirectoryToZip(zip, path.resolve(config.distDir), 'content');
    
    // Generate .nupkg file
    const packagePath = path.join(config.outputDir, `${config.name}.${config.version}.nupkg`);
    
    try {
      const buffer = await zip.generateAsync({ 
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });
      
      fs.writeFileSync(packagePath, buffer);
    } catch (error) {
      throw new Error(`Package creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async addDirectoryToZip(zip: JSZip, sourceDir: string, targetDir: string): Promise<void> {
    if (!fs.existsSync(sourceDir)) {
      throw new Error(`Source directory does not exist: ${sourceDir}`);
    }

    const files = fs.readdirSync(sourceDir, { withFileTypes: true });
    
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file.name);
      const targetPath = path.posix.join(targetDir, file.name); // Use posix for consistent ZIP paths
      
      if (file.isDirectory()) {
        // Recursively add subdirectories
        await this.addDirectoryToZip(zip, sourcePath, targetPath);
      } else if (file.isFile()) {
        // Add file to ZIP
        const content = fs.readFileSync(sourcePath);
        zip.file(targetPath, content);
      }
      // Skip symbolic links and other special files
    }
  }

  private async handleMetadataJson(config: any): Promise<void> {
    const sourceMetadata = path.join(process.cwd(), AUTH_CONSTANTS.FILES.METADATA_FILE);
    const targetMetadata = path.join(config.outputDir, AUTH_CONSTANTS.FILES.METADATA_FILE);
    
    if (fs.existsSync(sourceMetadata)) {
      fs.copyFileSync(sourceMetadata, targetMetadata);
    } else {
      // Create a basic metadata.json template
      const metadataTemplate = {
        name: config.name,
        version: config.version,
        description: config.description,
        author: config.author,
        contentType: config.contentType,
        createdAt: new Date().toISOString(),
      };
      
      fs.writeFileSync(targetMetadata, JSON.stringify(metadataTemplate, null, 2));
    }
  }

  private async loadAppConfig(): Promise<AppConfig | null> {
    const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR, AUTH_CONSTANTS.FILES.APP_CONFIG);

    try {
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(configContent) as AppConfig;
      }
    } catch (error) {
      this.debug(`${MESSAGES.ERRORS.FAILED_TO_LOAD_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`);
    }

    return null;
  }

  private async validateClientId(clientId: string, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora(MESSAGES.INFO.VALIDATING_CLIENT_ID).start();

    try {
      const url = `${envConfig.baseUrl}${API_ENDPOINTS.VALIDATE_CLIENT
        .replace('{orgId}', envConfig.orgId)
        .replace('{clientId}', encodeURIComponent(clientId))}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders({
          bearerToken: envConfig.accessToken,
          additionalHeaders: { 'Accept': 'application/json' },
        }),
      });

      if (response.status === 404) {
        spinner.fail(chalk.red(MESSAGE_BUILDERS.CLIENT_ID_NOT_FOUND(clientId, envConfig.orgName)));
        process.exit(1);
      }

      if (!response.ok) {
        await handleHttpError(response, MESSAGES.ERROR_CONTEXT.CLIENT_ID_VALIDATION);
      }

      const data = await response.json() as { isConfidential?: boolean };

      if (data.isConfidential !== false) {
        spinner.fail(chalk.red(MESSAGE_BUILDERS.CLIENT_ID_CONFIDENTIAL(clientId, envConfig.orgName)));
        process.exit(1);
      }

      spinner.succeed(chalk.green(MESSAGES.SUCCESS.CLIENT_ID_VALID));
    } catch (error) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.CLIENT_ID_VALIDATION_FAILED));
      this.log(chalk.red(`Error: ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }

  private async checkAppNameUniqueness(appName: string, envConfig: EnvironmentConfig): Promise<void> {
    const spinner = ora(MESSAGES.INFO.CHECKING_APP_NAME_UNIQUENESS).start();

    try {
      const endpoint = API_ENDPOINTS.CHECK_APP_NAME_UNIQUE.replace('{appName}', encodeURIComponent(appName));
      const url = `${envConfig.baseUrl}/${envConfig.orgId}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: createHeaders({
          bearerToken: envConfig.accessToken,
          tenantId: envConfig.tenantId,
          additionalHeaders: {
            'Accept': 'application/json',
            'X-UIPATH-OrganizationUnitId': envConfig.folderKey || '',
          }
        }),
      });

      if (!response.ok) {
        await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
      }

      const data = await response.json() as { isUnique: boolean };

      if (!data.isUnique) {
        spinner.fail(chalk.red(MESSAGES.ERRORS.APP_NAME_ALREADY_EXISTS));
        process.exit(1);
      }

      spinner.succeed(chalk.green('App name is available'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to check app name uniqueness'));
      this.log(chalk.red(`Error: ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
      process.exit(1);
    }
  }
}