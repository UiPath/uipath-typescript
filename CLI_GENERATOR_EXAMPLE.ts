/**
 * Example CLI Generator Script
 * 
 * This script demonstrates how to generate OCLIF commands from SDK methods
 * decorated with @cliCommand(). Run this as part of your build process.
 * 
 * Usage:
 *   ts-node CLI_GENERATOR_EXAMPLE.ts
 * 
 * This would typically be integrated into your build process to automatically
 * generate CLI commands whenever the SDK changes.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { 
  getCliCommandsFromService, 
  CliCommandMetadata 
} from './src/core/cli/metadata';
import { 
  generateOclifCommand, 
  generateOclifCommandClass,
  GeneratedOclifCommand 
} from './src/core/cli/generator';
import { UiPath } from './src/uipath';

/**
 * Configuration for CLI generation
 */
interface GeneratorConfig {
  outputDir: string;
  sdkConfig: {
    baseUrl: string;
    orgName: string;
    tenantName: string;
    // Add other SDK config as needed
  };
}

/**
 * Generate all CLI commands from SDK
 */
async function generateCliCommands(config: GeneratorConfig): Promise<void> {
  console.log('Generating CLI commands from SDK...');

  // Initialize SDK (minimal config for extraction)
  const sdk = new UiPath(config.sdkConfig);

  // Ensure output directory exists
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  // Extract commands from each service
  const services = [
    { instance: sdk.entities, path: 'entities' },
    { instance: sdk.processes, path: 'processes' },
    { instance: sdk.buckets, path: 'buckets' },
    { instance: sdk.queues, path: 'queues' },
    { instance: sdk.assets, path: 'assets' },
    { instance: sdk.tasks, path: 'tasks' },
    // Add nested services
    { instance: sdk.maestro.processes, path: 'maestro.processes' },
    { instance: sdk.maestro.cases, path: 'maestro.cases' },
  ];

  let totalCommands = 0;

  for (const service of services) {
    const commands = getCliCommandsFromService(service.instance);
    
    for (const [commandPath, metadata] of commands) {
      const oclifCommand = generateOclifCommand(metadata as CliCommandMetadata);
      
      // Generate command class code
      const commandCode = generateOclifCommandClass(
        oclifCommand,
        service.path,
        metadata.methodName
      );

      // Generate filename from command path
      // 'entities get-by-id' -> 'entities-get-by-id.ts'
      const filename = commandPath.replace(/\s+/g, '-') + '.ts';
      const filepath = join(config.outputDir, filename);

      // Write command file
      writeFileSync(filepath, commandCode, 'utf-8');
      console.log(`  ✓ Generated: ${filename}`);
      totalCommands++;
    }
  }

  console.log(`\n✅ Generated ${totalCommands} CLI commands`);
}

/**
 * Generate index file that exports all commands
 */
function generateIndexFile(outputDir: string, commands: GeneratedOclifCommand[]): void {
  const imports = commands.map((cmd, index) => {
    const className = cmd.id.split(':').map(part => 
      part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')
    ).join('');
    const filename = cmd.id.replace(/:/g, '-');
    return `import ${className}${index} from './${filename}';`;
  }).join('\n');

  const exports = commands.map((cmd, index) => {
    const className = cmd.id.split(':').map(part => 
      part.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')
    ).join('');
    return className + index;
  }).join(',\n  ');

  const indexContent = `${imports}

export {
  ${exports}
};
`;

  writeFileSync(join(outputDir, 'index.ts'), indexContent, 'utf-8');
  console.log('  ✓ Generated index.ts');
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const config: GeneratorConfig = {
    outputDir: join(process.cwd(), 'packages/cli/src/commands/generated'),
    sdkConfig: {
      baseUrl: process.env.UIPATH_BASE_URL || 'https://cloud.uipath.com',
      orgName: process.env.UIPATH_ORG_NAME || '',
      tenantName: process.env.UIPATH_TENANT_NAME || '',
    }
  };

  try {
    await generateCliCommands(config);
    console.log('\n✨ CLI command generation complete!');
  } catch (error) {
    console.error('❌ Error generating CLI commands:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { generateCliCommands, generateIndexFile };

