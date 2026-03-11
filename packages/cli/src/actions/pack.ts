import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import fetch from 'node-fetch';
import type { SdkConfig, EnvironmentConfig } from '../types/index.js';
import { MESSAGES } from '../constants/messages.js';
import { AUTH_CONSTANTS, DEFAULT_APP_VERSION, API_ENDPOINTS } from '../constants/index.js';
import { isValidAppName, getEnvironmentConfig } from '../utils/env-config.js';
import { createHeaders } from '../utils/api.js';
import { handleHttpError } from '../utils/error-handler.js';
import { cliTelemetryClient } from '../telemetry/index.js';

export interface PackOptions {
  dist: string;
  name?: string;
  version?: string;
  output?: string;
  author?: string;
  description?: string;
  mainFile?: string;
  contentType?: string;
  dryRun?: boolean;
  reuseClient?: boolean;
  baseUrl?: string;
  orgId?: string;
  tenantId?: string;
  accessToken?: string;
  logger?: { log: (message: string) => void };
}

interface PackageConfig {
  distDir: string;
  name: string;
  originalName: string;
  version: string;
  author: string;
  description: string;
  mainFile: string;
  contentType: string;
  outputDir: string;
  reuseClient: boolean;
  sdkConfig: SdkConfig | null;
}


function validateDistDirectory(distDir: string): boolean {
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) return false;
  return fs.readdirSync(distDir).length > 0;
}

function sanitizePackageName(name: string): string {
  return name.replace(/\s+/g, '');
}

function loadSdkConfig(logger: { log: (message: string) => void }): SdkConfig | null {
  const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.SDK_CONFIG);
  if (!fs.existsSync(configPath)) return null;
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as SdkConfig;
  } catch {
    logger.log(chalk.red(MESSAGES.ERRORS.CONFIG_FILE_INVALID_JSON));
    return null;
  }
}

function loadOrCreateSdkConfig(logger: { log: (message: string) => void }): SdkConfig | null {
  const existing = loadSdkConfig(logger);
  if (existing) return existing;

  logger.log(chalk.yellow(MESSAGES.INFO.CONFIG_FILE_NOT_FOUND_WARNING));
  const config: SdkConfig = {
    scope: '',
    clientId: '',
    orgName: '',
    tenantName: '',
    baseUrl: '',
    redirectUri: '',
  };
  const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.SDK_CONFIG);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  logger.log(chalk.green(MESSAGES.SUCCESS.CONFIG_FILE_CREATED));
  return config;
}

function copyConfigToDistDirectory(
  config: { distDir: string; reuseClient: boolean; sdkConfig: SdkConfig },
  logger: { log: (message: string) => void },
): void {
  const configDest = path.join(config.distDir, AUTH_CONSTANTS.FILES.SDK_CONFIG);
  const configToWrite: SdkConfig = { ...config.sdkConfig };

  if (!config.reuseClient) {
    configToWrite.clientId = '';
    logger.log(chalk.green(MESSAGES.SUCCESS.CLIENT_ID_CLEARED));
  } else if (config.sdkConfig.clientId) {
    logger.log(chalk.green(MESSAGES.SUCCESS.CLIENT_ID_REUSED));
  }

  fs.writeFileSync(configDest, JSON.stringify(configToWrite, null, 2));
  logger.log(chalk.green(MESSAGES.SUCCESS.CONFIG_FILE_INCLUDED));
}

async function checkAppNameUniqueness(
  appName: string,
  envConfig: EnvironmentConfig,
  _logger: { log: (message: string) => void },
): Promise<void> {
  const folderKey = envConfig.folderKey || process.env.UIPATH_FOLDER_KEY || '';
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
          Accept: 'application/json',
          'X-UIPATH-OrganizationUnitId': folderKey,
        },
      }),
    });
    if (!response.ok) {
      await handleHttpError(response, MESSAGES.ERROR_CONTEXT.APP_DEPLOYMENT);
    }
    const data = (await response.json()) as { isUnique: boolean };
    if (!data.isUnique) {
      spinner.fail(chalk.red(MESSAGES.ERRORS.APP_NAME_ALREADY_EXISTS));
      throw new Error(MESSAGES.ERRORS.APP_NAME_ALREADY_EXISTS);
    }
    spinner.succeed(chalk.green('App name is available'));
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail(chalk.red('Failed to check app name uniqueness'));
    }
    throw error;
  }
}

async function createOperateJson(config: PackageConfig): Promise<void> {
  const operateJson = {
    $schema: 'https://cloud.uipath.com/draft/2024-12/operate',
    projectId: uuidv4(),
    main: config.mainFile,
    contentType: config.contentType,
    targetFramework: 'Portable',
    runtimeOptions: { requiresUserInteraction: false, isAttended: false },
    designOptions: { projectProfile: 'Development', outputType: config.contentType },
  };
  fs.writeFileSync(path.join(config.distDir, 'operate.json'), JSON.stringify(operateJson, null, 2));
}

async function createBindingsJson(config: PackageConfig, version: string, suffix = ''): Promise<void> {
  const filePath = path.join(config.distDir, `bindings${suffix}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ version, resources: [] }, null, 2));
}

async function createEntryPointsJson(config: PackageConfig): Promise<void> {
  const entryPointsJson = {
    $schema: 'https://cloud.uipath.com/draft/2024-12/entry-point',
    $id: 'entry-points-doc-001',
    entryPoints: [{
      filePath: config.mainFile,
      uniqueId: uuidv4(),
      type: 'api',
      input: { amount: { type: 'integer' }, id: { type: 'string' } },
      output: { status: { type: 'string' } },
    }],
  };
  fs.writeFileSync(path.join(config.distDir, 'entry-points.json'), JSON.stringify(entryPointsJson, null, 2));
}

async function createPackageDescriptorJson(config: PackageConfig): Promise<void> {
  const packageDescriptorJson = {
    $schema: 'https://cloud.uipath.com/draft/2024-12/package-descriptor',
    files: {
      'operate.json': 'content/operate.json',
      'entry-points.json': 'content/entry-points.json',
      'bindings.json': 'content/bindings_v2.json',
    },
  };
  fs.writeFileSync(path.join(config.distDir, 'package-descriptor.json'), JSON.stringify(packageDescriptorJson, null, 2));
}

async function createMetadataFiles(config: PackageConfig): Promise<void> {
  await createOperateJson(config);
  await createBindingsJson(config, '1.0');
  await createBindingsJson(config, '2.0', '_v2');
  await createEntryPointsJson(config);
  await createPackageDescriptorJson(config);
}

function createNuspecContent(config: PackageConfig): string {
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

async function addDirectoryToZip(zip: JSZip, sourceDir: string, targetDir: string): Promise<void> {
  if (!fs.existsSync(sourceDir)) throw new Error(`Source directory does not exist: ${sourceDir}`);
  const files = fs.readdirSync(sourceDir, { withFileTypes: true });
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file.name);
    const targetPath = path.posix.join(targetDir, file.name);
    if (file.isDirectory()) await addDirectoryToZip(zip, sourcePath, targetPath);
    else if (file.isFile()) zip.file(targetPath, fs.readFileSync(sourcePath));
  }
}

async function createNupkgFile(config: PackageConfig): Promise<void> {
  const zip = new JSZip();
  zip.file(`${config.name}.nuspec`, createNuspecContent(config));
  await addDirectoryToZip(zip, path.resolve(config.distDir), 'content');
  const packagePath = path.join(config.outputDir, `${config.name}.${config.version}.nupkg`);
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  fs.writeFileSync(packagePath, buffer);
}

function handleMetadataJson(config: PackageConfig): void {
  const sourceMetadata = path.join(process.cwd(), AUTH_CONSTANTS.FILES.METADATA_FILE);
  const targetMetadata = path.join(config.outputDir, AUTH_CONSTANTS.FILES.METADATA_FILE);
  if (fs.existsSync(sourceMetadata)) {
    fs.copyFileSync(sourceMetadata, targetMetadata);
  } else {
    fs.writeFileSync(
      targetMetadata,
      JSON.stringify({
        name: config.name,
        version: config.version,
        description: config.description,
        author: config.author,
        contentType: config.contentType,
        createdAt: new Date().toISOString(),
      }, null, 2),
    );
  }
}

export async function executePack(options: PackOptions): Promise<void> {
  const logger = options.logger ?? { log: console.log };
  cliTelemetryClient.track('Cli.Pack');

  logger.log(chalk.blue(MESSAGES.INFO.PACKAGE_CREATOR));

  const distDir = options.dist;
  if (!validateDistDirectory(distDir)) {
    throw new Error(`${MESSAGES.ERRORS.INVALID_DIST_DIRECTORY}: ${distDir}`);
  }

  let packageName = options.name;
  if (!packageName) {
    const response = await inquirer.prompt<{ name: string }>([{
      type: 'input',
      name: 'name',
      message: MESSAGES.PROMPTS.ENTER_APP_NAME,
      validate: (input: string) => {
        if (!input.trim()) return MESSAGES.VALIDATIONS.PACKAGE_NAME_REQUIRED;
        if (!isValidAppName(input)) return MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS;
        return true;
      },
    }]);
    packageName = response.name;
  }

  if (!packageName) throw new Error(MESSAGES.ERRORS.PACKAGE_NAME_REQUIRED);
  if (!isValidAppName(packageName)) throw new Error(MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS);

  const version = options.version ?? DEFAULT_APP_VERSION;
  const isVersionUpgrade = version !== DEFAULT_APP_VERSION;

  // App name uniqueness check is mandatory for new apps (non-version-upgrade)
  if (!isVersionUpgrade) {
    const envConfig = getEnvironmentConfig(
      AUTH_CONSTANTS.REQUIRED_ENV_VARS.PACK,
      logger,
      {
        baseUrl: options.baseUrl,
        orgId: options.orgId,
        tenantId: options.tenantId,
        accessToken: options.accessToken,
      },
    );
    if (!envConfig) throw new Error('Missing required configuration for app name uniqueness check');
    await checkAppNameUniqueness(packageName, envConfig, logger);
  }

  // Load or create SDK config (uipath.json)
  const sdkConfig = loadOrCreateSdkConfig(logger);

  // Handle reuse-client logic
  let reuseClient = options.reuseClient ?? false;
  if (!reuseClient && sdkConfig?.clientId?.trim()) {
    if (isVersionUpgrade) {
      reuseClient = true;
    } else {
      const response = await inquirer.prompt<{ createNew: boolean }>([{
        type: 'confirm',
        name: 'createNew',
        message: MESSAGES.PROMPTS.REUSE_CLIENT_ID,
        default: false,
      }]);
      reuseClient = !response.createNew;
    }
  }

  if (!isVersionUpgrade && sdkConfig?.clientId?.trim() && !sdkConfig?.scope?.trim()) {
    logger.log(chalk.blue(MESSAGES.INFO.SCOPE_NOT_PROVIDED_USING_CLIENT_SCOPES));
  }

  const sanitizedName = sanitizePackageName(packageName);
  const description = options.description ?? packageName;

  const packageConfig: PackageConfig = {
    distDir,
    name: sanitizedName,
    originalName: packageName,
    version,
    author: options.author ?? 'UiPath Developer',
    description,
    mainFile: options.mainFile ?? 'index.html',
    contentType: options.contentType ?? 'webapp',
    outputDir: options.output ?? './.uipath',
    reuseClient,
    sdkConfig,
  };

  if (options.dryRun) {
    logger.log(chalk.yellow(MESSAGES.INFO.PACKAGE_PREVIEW));
    logger.log('');
    logger.log(`${chalk.bold('Package Name:')} ${packageConfig.name}`);
    logger.log(`${chalk.bold('Original Name:')} ${packageConfig.originalName}`);
    logger.log(`${chalk.bold('Version:')} ${packageConfig.version}`);
    logger.log(`${chalk.bold('Author:')} ${packageConfig.author}`);
    logger.log(`${chalk.bold('Description:')} ${packageConfig.description}`);
    logger.log(`${chalk.bold('Content Type:')} ${packageConfig.contentType}`);
    logger.log(`${chalk.bold('Main File:')} ${packageConfig.mainFile}`);
    logger.log(`${chalk.bold('Dist Directory:')} ${packageConfig.distDir}`);
    logger.log(`${chalk.bold('Output Directory:')} ${packageConfig.outputDir}`);
    logger.log('');
    logger.log(chalk.bold('Files to be created:'));
    logger.log('  - operate.json');
    logger.log('  - bindings.json');
    logger.log('  - bindings_v2.json');
    logger.log('  - entry-points.json');
    logger.log('  - package-descriptor.json');
    logger.log(`  - ${packageConfig.name}.${packageConfig.version}.nupkg (contains .nuspec and all content)`);
    logger.log('');
    logger.log(chalk.green(MESSAGES.SUCCESS.PACKAGE_CONFIG_VALIDATED));
    logger.log(chalk.blue(MESSAGES.INFO.RUN_WITHOUT_DRY_RUN));
    return;
  }

  const spinner = ora(MESSAGES.INFO.CREATING_PACKAGE).start();
  try {
    if (!fs.existsSync(packageConfig.outputDir)) {
      fs.mkdirSync(packageConfig.outputDir, { recursive: true });
      logger.log(chalk.dim(`${MESSAGES.INFO.CREATED_OUTPUT_DIRECTORY} ${packageConfig.outputDir}`));
    }

    // Copy uipath.json to dist directory (with clientId handling)
    if (packageConfig.sdkConfig) {
      copyConfigToDistDirectory(
        { distDir: packageConfig.distDir, reuseClient: packageConfig.reuseClient, sdkConfig: packageConfig.sdkConfig },
        logger,
      );
    }

    spinner.text = MESSAGES.INFO.CREATING_METADATA_FILES;
    await createMetadataFiles(packageConfig);
    spinner.text = MESSAGES.INFO.CREATING_NUPKG_PACKAGE;
    await createNupkgFile(packageConfig);
    handleMetadataJson(packageConfig);
    spinner.succeed(chalk.green(MESSAGES.SUCCESS.PACKAGE_CREATED_SUCCESS));

    logger.log('');
    logger.log(`${chalk.bold('Package Details:')}`);
    logger.log(`  Name: ${packageConfig.name}`);
    logger.log(`  Version: ${packageConfig.version}`);
    logger.log(`  Type: ${packageConfig.contentType}`);
    logger.log(`  Location: ${path.join(packageConfig.outputDir, `${packageConfig.name}.${packageConfig.version}.nupkg`)}`);
    logger.log('');
    logger.log(chalk.blue(MESSAGES.INFO.PACKAGE_READY));
    logger.log(chalk.dim(MESSAGES.INFO.USE_PUBLISH_TO_UPLOAD));
  } catch (error) {
    spinner.fail(chalk.red(MESSAGES.ERRORS.PACKAGE_CREATION_FAILED));
    throw new Error(
      `${MESSAGES.ERRORS.PACKAGING_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`,
    );
  }
}
