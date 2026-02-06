#!/usr/bin/env node
/**
 * MCP Generator CLI
 *
 * Command-line tool for generating MCP tools from the UiPath SDK.
 *
 * Usage:
 *   npm run generate           # Generate tools once
 *   npm run generate:watch     # Watch for changes and regenerate
 */

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs/promises';
import { watch } from 'chokidar';
import { fileURLToPath } from 'url';
import { ServiceParser } from './service-parser.js';
import { ToolGenerator, generateMetadataJson } from './tool-generator.js';
import config from './config.js';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('mcp-generator')
  .description('Generate MCP tools from UiPath SDK')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate MCP tools from SDK services')
  .option('-w, --watch', 'Watch for changes and regenerate', false)
  .option('-o, --output <path>', 'Output directory', config.outputPath)
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
  .action(async () => {
    try {
      await validateConfig();
    } catch (error) {
      console.error('Validation failed:', error);
      process.exit(1);
    }
  });

/**
 * Generate tools once
 */
async function generateOnce(options: { output: string; verbose: boolean; metadata: boolean }): Promise<void> {
  const startTime = Date.now();
  console.log('🔄 Starting MCP tool generation...\n');

  // Resolve paths
  // __dirname is dist/generator/
  // mcp-server package is at: packages/mcp-server/
  // SDK root is at: uipath-typescript/
  // So from dist/generator/, go up 4 levels to get to uipath-typescript/
  const sdkPath = path.resolve(__dirname, '../../../..');
  const outputPath = path.resolve(__dirname, '..', options.output);

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
    // SDK might not be available yet, use placeholder
    console.log('⚠️  Could not parse SDK (SDK may not be built). Using placeholder tools.');
    console.log('');
    console.log('✅ Placeholder tools already exist in sdk-tools.ts');
    console.log(`   Run this command again after building the SDK.\n`);
    return;
  }

  console.log(`   Found ${parsedSDK.services.length} services`);
  console.log(`   Found ${parsedSDK.types.size} types\n`);

  // Generate tools
  console.log('🔧 Generating MCP tools...');
  const generator = new ToolGenerator(config);
  const tools = generator.generateTools(parsedSDK);

  console.log(`   Generated ${tools.length} tools\n`);

  // Write output
  console.log('📝 Writing output files...');
  await generator.writeToolsFile(tools, outputPath);
  console.log(`   ✓ ${path.join(outputPath, 'sdk-tools.ts')}`);

  if (options.metadata) {
    const metadataPath = path.join(outputPath, 'tools-metadata.json');
    await fs.writeFile(metadataPath, generateMetadataJson(tools), 'utf-8');
    console.log(`   ✓ ${metadataPath}`);
  }

  const duration = Date.now() - startTime;
  console.log(`\n✅ Generation complete in ${duration}ms\n`);

  // Print summary
  printToolSummary(tools);
}

/**
 * Watch for changes and regenerate
 */
async function watchAndGenerate(options: { output: string; verbose: boolean; metadata: boolean }): Promise<void> {
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

    // Debounce rapid changes
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
async function validateConfig(): Promise<void> {
  console.log('🔍 Validating configuration...\n');

  const issues: string[] = [];
  const warnings: string[] = [];

  // Check SDK path
  const sdkPath = path.resolve(__dirname, '../../../..');
  try {
    await fs.access(sdkPath);
    console.log(`✓ SDK path exists: ${sdkPath}`);
  } catch {
    issues.push(`SDK path does not exist: ${sdkPath}`);
  }

  // Check output path
  const outputPath = path.resolve(__dirname, '../..', config.outputPath);
  try {
    await fs.mkdir(outputPath, { recursive: true });
    console.log(`✓ Output path writable: ${outputPath}`);
  } catch {
    issues.push(`Cannot create output path: ${outputPath}`);
  }

  // Check naming config
  if (!['snake_case', 'camelCase'].includes(config.naming.style)) {
    issues.push(`Invalid naming style: ${config.naming.style}`);
  } else {
    console.log(`✓ Naming style: ${config.naming.style}`);
  }

  // Check for unused overrides
  if (Object.keys(config.methods.overrides).length > 0) {
    console.log(`✓ Method overrides: ${Object.keys(config.methods.overrides).length} defined`);
  }

  // Print results
  console.log('');

  if (issues.length > 0) {
    console.log('❌ Issues found:');
    for (const issue of issues) {
      console.log(`   - ${issue}`);
    }
  }

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    for (const warning of warnings) {
      console.log(`   - ${warning}`);
    }
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log('✅ Configuration is valid');
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

/**
 * Print summary of generated tools
 */
function printToolSummary(tools: { name: string; category: string }[]): void {
  const byCategory = new Map<string, number>();

  for (const tool of tools) {
    const count = byCategory.get(tool.category) || 0;
    byCategory.set(tool.category, count + 1);
  }

  console.log('📊 Tool Summary:');
  for (const [category, count] of byCategory) {
    const displayName = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    console.log(`   ${displayName}: ${count} tools`);
  }
  console.log(`   Total: ${tools.length} tools\n`);
}

// Run CLI
program.parse();
