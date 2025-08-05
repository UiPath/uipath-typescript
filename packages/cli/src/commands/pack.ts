import { Command, Flags, Args } from '@oclif/core';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';

export default class Pack extends Command {
  static override description = 'Package UiPath projects as NuGet packages with metadata files (no external dependencies required)';

  static override examples = [
    '<%= config.bin %> <%= command.id %> ./dist/my-app --name MyApp',
    '<%= config.bin %> <%= command.id %> ./dist/my-app --name MyApp --version 1.0.0',
    '<%= config.bin %> <%= command.id %> ./dist/my-app --name MyApp --output ./.uipath',
    '<%= config.bin %> <%= command.id %> ./dist/my-app --name MyApp --dry-run',
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
      default: '1.0.0',
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
    'dry-run': Flags.boolean({
      description: 'Show what would be packaged without creating the package',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Pack);
    
    this.log(chalk.blue('📦 UiPath NuGet Package Creator'));

    // Get dist directory from args
    const distDir = args.dist;
    
    // Validate dist directory
    if (!this.validateDistDirectory(distDir)) {
      this.error(`Invalid dist directory: ${distDir}`);
    }

    // Get package name
    const packageName = flags.name || await this.promptForPackageName();
    const sanitizedName = this.sanitizePackageName(packageName);
    
    // Get package description
    const description = flags.description || await this.promptForDescription(packageName);

    const packageConfig = {
      distDir,
      name: sanitizedName,
      originalName: packageName,
      version: flags.version,
      author: flags.author,
      description,
      mainFile: flags['main-file'],
      contentType: flags['content-type'],
      outputDir: flags.output,
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
        message: 'Enter package name:',
        validate: (input: string) => {
          if (!input.trim()) {
            return 'Package name is required';
          }
          return true;
        },
      },
    ]);
    
    return response.name;
  }

  private async promptForDescription(packageName: string): Promise<string> {
    const response = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Enter package description:',
        default: `UiPath package for ${packageName}`,
      },
    ]);
    
    return response.description;
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

  private sanitizePackageName(name: string): string {
    // Replace hyphens with underscores and remove invalid characters
    return name.replace(/-/g, '_').replace(/[^a-zA-Z0-9_.]/g, '');
  }


  private async showPackagePreview(config: any): Promise<void> {
    this.log(chalk.yellow('🔍 Package Preview'));
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
    this.log(chalk.green('✅ Package configuration validated'));
    this.log(chalk.blue('💡 Run without --dry-run to create the package'));
  }

  private async createNuGetPackage(config: any): Promise<void> {
    const spinner = ora('Creating NuGet package...').start();
    
    try {
      // Ensure output directory exists
      if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
        this.log(chalk.dim(`Created output directory: ${config.outputDir}`));
      }

      // Create metadata files in dist directory
      spinner.text = 'Creating metadata files...';
      await this.createMetadataFiles(config);
      
      // Create .nupkg using JSZip
      spinner.text = 'Creating .nupkg package...';
      await this.createNupkgFile(config);
      
      // Handle metadata.json
      await this.handleMetadataJson(config);
      
      spinner.succeed(chalk.green('✅ NuGet package created successfully!'));
      
      this.log('');
      this.log(`${chalk.bold('Package Details:')}`);
      this.log(`  Name: ${config.name}`);
      this.log(`  Version: ${config.version}`);
      this.log(`  Type: ${config.contentType}`);
      this.log(`  Location: ${path.join(config.outputDir, `${config.name}.${config.version}.nupkg`)}`);
      this.log('');
      this.log(chalk.blue('🎉 Package is ready for publishing!'));
      this.log(chalk.dim('💡 Use "uipath publish" to upload to UiPath Orchestrator'));
      
    } catch (error) {
      spinner.fail(chalk.red('❌ Package creation failed'));
      this.error(`Packaging error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const sourceMetadata = path.join(process.cwd(), 'metadata.json');
    const targetMetadata = path.join(config.outputDir, 'metadata.json');
    
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
}