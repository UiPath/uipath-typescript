import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import type { AppConfig } from '../types/index.js';
import { MESSAGES } from '../constants/messages.js';
import { AUTH_CONSTANTS } from '../constants/index.js';
import { isValidAppName } from '../utils/env-config.js';
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
}

function loadAppConfig(logger: { log: (message: string) => void }): AppConfig | null {
  const configPath = path.join(process.cwd(), AUTH_CONSTANTS.FILES.UIPATH_DIR, AUTH_CONSTANTS.FILES.APP_CONFIG);
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig;
    }
  } catch (error) {
    logger.log(chalk.dim(`${MESSAGES.ERRORS.FAILED_TO_LOAD_APP_CONFIG} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`));
  }
  return null;
}

function validateDistDirectory(distDir: string): boolean {
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) return false;
  return fs.readdirSync(distDir).length > 0;
}

function sanitizePackageName(name: string): string {
  return name.replace(/\s+/g, '');
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
      JSON.stringify(
        {
          name: config.name,
          version: config.version,
          description: config.description,
          author: config.author,
          contentType: config.contentType,
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
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

  const appConfig = await loadAppConfig(logger);
  let packageName = options.name;
  let version = options.version ?? '1.0.0';

  if (appConfig && !options.name) {
    packageName = appConfig.appName;
    if (options.version === undefined && appConfig.appVersion !== '1.0.0') version = appConfig.appVersion;
    logger.log(chalk.green(`${MESSAGES.SUCCESS.USING_REGISTERED_APP}: ${packageName} v${version}`));
  } else if (!options.name) {
    const response = await inquirer.prompt<{ name: string }>([
      {
        type: 'input',
        name: 'name',
        message: MESSAGES.PROMPTS.ENTER_PACKAGE_NAME,
        validate: (input: string) => {
          if (!input.trim()) return MESSAGES.VALIDATIONS.PACKAGE_NAME_REQUIRED;
          if (!isValidAppName(input)) return MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS;
          return true;
        },
      },
    ]);
    packageName = response.name;
  }

  if (appConfig && (packageName !== appConfig.appName || version !== appConfig.appVersion)) {
    logger.log(chalk.yellow(`⚠️  Warning: You registered app "${appConfig.appName}" v${appConfig.appVersion} but are packaging as "${packageName}" v${version}. Remove --name flag to automatically use registered app details.`));
    const { continue: cont } = await inquirer.prompt<{ continue: boolean }>([{
      type: 'confirm',
      name: 'continue',
      message: MESSAGES.PROMPTS.CONTINUE_WITH_DIFFERENT_VALUES,
      default: false,
    }]);
    if (!cont) {
      logger.log(chalk.blue(MESSAGES.INFO.USE_REGISTERED_VALUES));
      return;
    }
  }

  if (!packageName) throw new Error(MESSAGES.ERRORS.PACKAGE_NAME_REQUIRED);
  if (!isValidAppName(packageName)) throw new Error(MESSAGES.VALIDATIONS.APP_NAME_INVALID_CHARS);

  const sanitizedName = sanitizePackageName(packageName);
  const description =
    options.description ??
    (
      await inquirer.prompt<{ description: string }>([{
        type: 'input',
        name: 'description',
        message: MESSAGES.PROMPTS.ENTER_PACKAGE_DESCRIPTION,
        default: `UiPath package for ${packageName}`,
      }])
    ).description;

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
      `${MESSAGES.ERRORS.PACKAGING_ERROR_PREFIX} ${error instanceof Error ? error.message : MESSAGES.ERRORS.UNKNOWN_ERROR}`
    );
  }
}
