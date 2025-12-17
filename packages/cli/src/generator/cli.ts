#!/usr/bin/env node
/**
 * CLI Command Generator
 *
 * Command-line tool for generating CLI commands from the UiPath SDK.
 *
 * Usage:
 *   npm run generate           # Generate commands once
 *   npm run generate:watch     # Watch for changes and regenerate
 *
 * Configuration:
 *   Create a generator.config.ts file in the package root to customize generation.
 *   If no config file is present, all SDK methods will be included by default.
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { watch } from 'chokidar';
import { fileURLToPath } from 'url';
import { ServiceParser } from './service-parser.js';
import { CommandGenerator, generateMetadataJson, GeneratedCommand } from './command-generator.js';
import { loadConfig, validateConfig as validateGeneratorConfig } from './config.loader.js';
import { GeneratorConfig, defaultConfig } from './config.schema.js';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default output path (directly in commands/, no "generated" prefix)
const DEFAULT_OUTPUT = 'commands';

const program = new Command();

program
  .name('cli-generator')
  .description('Generate CLI commands from UiPath SDK')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate CLI commands from SDK services')
  .option('-w, --watch', 'Watch for changes and regenerate', false)
  .option('-o, --output <path>', 'Output directory', DEFAULT_OUTPUT)
  .option('-c, --config <path>', 'Path to generator config file')
  .option('-v, --verbose', 'Verbose output', false)
  .option('--metadata', 'Also generate metadata JSON file', false)
  .action(async (options) => {
    try {
      if (options.watch) {
        await watchAndGenerate(options);
      } else {
        await generateOnce(options);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all discovered SDK services and methods')
  .action(async () => {
    try {
      await listServices();
    } catch (error) {
      console.error('Failed to list services:', error);
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate the generator configuration')
  .option('-c, --config <path>', 'Path to generator config file')
  .action(async (options) => {
    try {
      await validateConfig(options.config);
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample generator.config.ts file')
  .action(async () => {
    try {
      await initConfig();
    } catch (error) {
      console.error('Failed to create config:', error);
      process.exit(1);
    }
  });

/**
 * Generate commands once
 */
async function generateOnce(options: { output: string; config?: string; verbose: boolean; metadata: boolean }): Promise<void> {
  const startTime = Date.now();
  console.log('🔄 Starting CLI command generation...\n');

  // Load configuration
  const configDir = options.config ? path.dirname(options.config) : path.resolve(__dirname, '../..');
  const { config, configPath } = await loadConfig(configDir);

  if (configPath) {
    console.log(`📋 Using config: ${configPath}`);
  } else {
    console.log('📋 No config file found, using defaults (all methods included)');
  }
  console.log('');

  // Resolve paths
  const sdkPath = path.resolve(__dirname, '../../../..');
  const outputPath = path.resolve(__dirname, '..', options.output || config.output?.cli || DEFAULT_OUTPUT);

  if (options.verbose) {
    console.log(`SDK path: ${sdkPath}`);
    console.log(`Output path: ${outputPath}`);
    console.log('');
  }

  // Parse SDK
  console.log('📖 Parsing SDK services...');
  const parser = new ServiceParser(sdkPath);
  let parsedSDK;

  try {
    parsedSDK = await parser.parseServices();
  } catch (error) {
    console.log('⚠️  Could not parse SDK (SDK may not be built). Skipping generation.');
    console.log('');
    console.log('   Run this command again after building the SDK.\n');
    return;
  }

  if (parsedSDK.services.length === 0) {
    console.log('⚠️  No services found. SDK may not be built yet.');
    console.log('');
    return;
  }

  console.log(`   Found ${parsedSDK.services.length} services`);
  console.log(`   Found ${parsedSDK.types.size} types\n`);

  // Generate commands
  console.log('🔧 Generating CLI commands...');
  const generator = new CommandGenerator(config);
  const commands = generator.generateCommands(parsedSDK);

  console.log(`   Generated ${commands.length} commands\n`);

  // Write output
  console.log('📝 Writing output files...');
  await generator.writeCommandFiles(commands, outputPath);
  console.log(`   ✓ ${outputPath}`);

  if (options.metadata) {
    const metadataPath = path.join(outputPath, 'commands-metadata.json');
    await fs.writeFile(metadataPath, generateMetadataJson(commands), 'utf-8');
    console.log(`   ✓ ${metadataPath}`);
  }

  const duration = Date.now() - startTime;
  console.log(`\n✅ Generation complete in ${duration}ms\n`);

  // Print summary
  printCommandSummary(commands);
}

/**
 * Watch for changes and regenerate
 */
async function watchAndGenerate(options: { output: string; config?: string; verbose: boolean; metadata: boolean }): Promise<void> {
  const sdkPath = path.resolve(__dirname, '../../../..');

  console.log('👀 Watching for SDK changes...');
  console.log(`   Path: ${sdkPath}/src/services`);
  console.log('   Press Ctrl+C to stop\n');

  // Initial generation
  await generateOnce(options);

  // Watch for changes
  const watcher = watch([
    path.join(sdkPath, 'src/services/**/*.ts'),
    path.join(sdkPath, 'src/models/**/*.ts')
  ], {
    ignored: /node_modules|\.test\.|\.spec\./,
    persistent: true,
    ignoreInitial: true
  });

  let debounceTimeout: NodeJS.Timeout | null = null;

  watcher.on('change', (filePath) => {
    console.log(`\n📝 Changed: ${path.relative(sdkPath, filePath)}`);

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(async () => {
      await generateOnce(options);
    }, 500);
  });

  watcher.on('add', (filePath) => {
    console.log(`\n➕ Added: ${path.relative(sdkPath, filePath)}`);

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(async () => {
      await generateOnce(options);
    }, 500);
  });

  watcher.on('unlink', (filePath) => {
    console.log(`\n➖ Removed: ${path.relative(sdkPath, filePath)}`);

    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    debounceTimeout = setTimeout(async () => {
      await generateOnce(options);
    }, 500);
  });

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n\n👋 Stopping watch mode...');
    watcher.close();
    process.exit(0);
  });
}

/**
 * List all discovered services
 */
async function listServices(): Promise<void> {
  const sdkPath = path.resolve(__dirname, '../../../..');

  console.log('📖 Discovering SDK services...\n');

  const parser = new ServiceParser(sdkPath);

  try {
    const parsedSDK = await parser.parseServices();

    for (const service of parsedSDK.services) {
      console.log(`📦 ${service.name} (${service.category})`);
      console.log(`   ${service.description}`);
      console.log(`   Methods:`);

      for (const method of service.methods) {
        const params = method.parameters.map(p =>
          `${p.name}${p.isOptional ? '?' : ''}: ${p.type}`
        ).join(', ');
        console.log(`     - ${method.name}(${params})`);
      }
      console.log('');
    }

    console.log(`\nTotal: ${parsedSDK.services.length} services, ${parsedSDK.services.reduce((sum, s) => sum + s.methods.length, 0)} methods`);
  } catch (error) {
    console.log('⚠️  Could not parse SDK. Make sure the SDK is built first.');
    console.log(`   SDK path: ${sdkPath}`);
  }
}

/**
 * Validate generator configuration
 */
async function validateConfig(configPath?: string): Promise<void> {
  console.log('🔍 Validating configuration...\n');

  const configDir = configPath ? path.dirname(configPath) : path.resolve(__dirname, '../..');
  const { config, configPath: foundPath } = await loadConfig(configDir);

  if (foundPath) {
    console.log(`✓ Config file found: ${foundPath}`);
  } else {
    console.log('ℹ️  No config file found, using defaults');
  }

  // Validate the config
  const { valid, errors } = validateGeneratorConfig(config);

  // Check SDK path
  const sdkPath = path.resolve(__dirname, '../../../..');
  try {
    await fs.access(sdkPath);
    console.log(`✓ SDK path exists: ${sdkPath}`);
  } catch {
    errors.push(`SDK path does not exist: ${sdkPath}`);
  }

  // Check output path
  const outputPath = path.resolve(__dirname, '..', config.output?.cli || DEFAULT_OUTPUT);
  try {
    await fs.mkdir(outputPath, { recursive: true });
    console.log(`✓ Output path writable: ${outputPath}`);
  } catch {
    errors.push(`Cannot create output path: ${outputPath}`);
  }

  // Check composites
  if (config.composites && config.composites.length > 0) {
    console.log(`✓ Composite tools: ${config.composites.length} defined`);
  }

  // Check custom tools
  if (config.custom && config.custom.length > 0) {
    console.log(`✓ Custom tools: ${config.custom.length} defined`);
  }

  // Check overrides
  if (config.overrides && Object.keys(config.overrides).length > 0) {
    console.log(`✓ Method overrides: ${Object.keys(config.overrides).length} defined`);
  }

  // Print results
  console.log('');

  if (errors.length > 0) {
    console.log('❌ Issues found:');
    for (const error of errors) {
      console.log(`   - ${error}`);
    }
  }

  if (errors.length === 0) {
    console.log('✅ Configuration is valid');
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

/**
 * Create a sample generator.config.ts file
 */
async function initConfig(): Promise<void> {
  const configPath = path.resolve(__dirname, '../../generator.config.ts');

  try {
    await fs.access(configPath);
    console.log('⚠️  generator.config.ts already exists');
    return;
  } catch {
    // File doesn't exist, create it
  }

  const sampleConfig = `/**
 * Generator Configuration
 *
 * Customize CLI command and MCP tool generation from SDK services.
 * By default, all SDK methods are included if no config is present.
 *
 * For full documentation, see: docs/generator-config.md
 */

import { GeneratorConfig } from './src/generator/config.schema.js';

const config: GeneratorConfig = {
  // Output paths (optional - defaults will be used if not specified)
  output: {
    cli: 'src/commands/generated',
    mcp: 'src/tools/generated',
  },

  // Service-level configuration (optional)
  services: {
    // Example: skip entire service
    // 'InternalService': { skip: true },

    // Example: rename CLI group
    // 'TaskService': { cliGroup: 'action-tasks' },
  },

  // Method-level overrides (optional)
  overrides: {
    // Example: customize a specific method
    // 'TaskService.create': {
    //   cli: {
    //     name: 'new',
    //     description: 'Create a new Action Center task',
    //   },
    //   mcp: {
    //     name: 'create_action_center_task',
    //     description: 'Creates a new Action Center task for human workflows',
    //   },
    // },
  },

  // Methods to skip (supports glob patterns)
  skip: [
    // '*.internal*',  // Skip all internal methods
    // 'TaskService.deprecatedMethod',
  ],

  // Composite tools - combine multiple SDK calls into one tool
  composites: [
    // Example: create and assign task in one operation
    // {
    //   name: 'createAndAssignTask',
    //   description: 'Creates a task and assigns it to a user',
    //   cliGroup: 'tasks',
    //   parameters: {
    //     task: { type: 'object', required: true, description: 'Task data' },
    //     folderId: { type: 'number', required: true, description: 'Folder ID' },
    //     userId: { type: 'string', required: true, description: 'User to assign' },
    //   },
    //   steps: [
    //     { call: 'TaskService.create', args: ['task', 'folderId'], output: 'createdTask' },
    //     { call: 'TaskService.assign', args: [{ taskIds: ['createdTask.id'], userId: 'userId' }] },
    //   ],
    //   returns: { value: 'createdTask' },
    // },
  ],

  // Custom tools with their own handlers
  custom: [
    // Example: health check tool
    // {
    //   name: 'healthCheck',
    //   description: 'Check API connectivity',
    //   cliGroup: 'system',
    //   parameters: {
    //     verbose: { type: 'boolean', required: false, default: false },
    //   },
    //   handler: './custom-handlers/health-check.ts',
    // },
  ],

  // Global settings
  settings: {
    includeByDefault: true,  // Include all methods by default
    generateCli: true,       // Generate CLI commands
    generateMcp: true,       // Generate MCP tools
  },
};

export default config;
`;

  await fs.writeFile(configPath, sampleConfig, 'utf-8');
  console.log(`✅ Created generator.config.ts`);
  console.log(`   Edit this file to customize command generation.`);
}

/**
 * Print summary of generated commands
 */
function printCommandSummary(commands: GeneratedCommand[]): void {
  // Group by service category
  const byCategory = new Map<string, number>();

  for (const command of commands) {
    // Determine category from service name or group
    let category = 'other';
    if (command.serviceName.includes('Task')) category = 'Action Center';
    else if (command.serviceName.includes('Entity')) category = 'Data Fabric';
    else if (command.serviceName.includes('Maestro') || command.group.startsWith('maestro')) category = 'Maestro';
    else if (command.serviceName.includes('Process') || command.serviceName.includes('Asset') ||
             command.serviceName.includes('Queue') || command.serviceName.includes('Bucket')) category = 'Orchestrator';
    else if (command.isComposite) category = 'Composite';
    else if (command.isCustom) category = 'Custom';

    const count = byCategory.get(category) || 0;
    byCategory.set(category, count + 1);
  }

  console.log('📊 Command Summary:');
  for (const [category, count] of byCategory) {
    console.log(`   ${category}: ${count} commands`);
  }
  console.log(`   Total: ${commands.length} commands\n`);

  // List command groups
  const groups = new Set(commands.map(c => c.group));
  console.log('📋 Command Groups:');
  for (const group of groups) {
    const groupCommands = commands.filter(c => c.group === group);
    console.log(`   uipath ${group}`);
    for (const cmd of groupCommands) {
      console.log(`     - ${cmd.name}`);
    }
  }
}

// Run CLI
program.parse();
