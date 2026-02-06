/**
 * CLI Command Generator
 *
 * Generates oclif command files from parsed SDK service metadata.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ServiceInfo, ServiceMethod, ParsedSDK, MethodParameter } from './service-parser.js';
import { serviceNameToCommandGroup, methodToCommandName } from './service-parser.js';
import type { CLIGeneratorConfig, MethodOverride } from './config.js';

export interface GeneratedCommand {
  name: string;
  group: string;
  fullName: string;
  description: string;
  flags: FlagDefinition[];
  category: string;
  serviceName: string;
  methodName: string;
  examples: string[];
}

export interface FlagDefinition {
  name: string;
  type: 'string' | 'integer' | 'boolean';
  description: string;
  required: boolean;
  char?: string;
  default?: string;
}

/**
 * Generate CLI commands from parsed SDK
 */
export class CommandGenerator {
  private config: CLIGeneratorConfig;

  constructor(config: CLIGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate all commands from parsed SDK metadata
   */
  generateCommands(parsedSDK: ParsedSDK): GeneratedCommand[] {
    const commands: GeneratedCommand[] = [];

    for (const service of parsedSDK.services) {
      // Check if service should be included
      if (!this.shouldIncludeService(service)) {
        continue;
      }

      for (const method of service.methods) {
        // Check if method should be included
        if (!this.shouldIncludeMethod(service, method)) {
          continue;
        }

        const command = this.generateCommand(service, method);
        if (command) {
          commands.push(command);
        }
      }
    }

    return commands;
  }

  /**
   * Generate a single command from a service method
   */
  private generateCommand(service: ServiceInfo, method: ServiceMethod): GeneratedCommand {
    const group = serviceNameToCommandGroup(service.name);
    const name = methodToCommandName(method.name);
    const fullName = `${group} ${name}`;
    const override = this.getMethodOverride(service.name, method.name);

    // Get description (from override, JSDoc, or generate)
    const description = override?.description ||
      this.config.descriptions[fullName] ||
      method.description ||
      `${method.name} operation for ${service.name}`;

    // Generate flags from method parameters
    const flags = this.generateFlags(method, override);

    // Generate examples
    const examples = override?.examples || this.generateExamples(group, name, flags);

    return {
      name,
      group,
      fullName,
      description,
      flags,
      category: service.category,
      serviceName: service.name,
      methodName: method.name,
      examples
    };
  }

  /**
   * Generate flag definitions from method parameters
   */
  private generateFlags(method: ServiceMethod, override?: MethodOverride): FlagDefinition[] {
    const flags: FlagDefinition[] = [];

    for (const param of method.parameters) {
      // Skip 'this' and internal params
      if (param.name === 'this' || param.name.startsWith('_')) {
        continue;
      }

      const flagOverride = override?.flags?.[param.name];
      const flagName = this.paramNameToFlagName(param.name);
      const flagType = this.typeToFlagType(param.type);

      flags.push({
        name: flagName,
        type: flagType,
        description: flagOverride?.description || param.description || `${param.name} parameter`,
        required: flagOverride?.required ?? !param.isOptional,
        char: flagOverride?.char,
        default: param.defaultValue
      });
    }

    return flags;
  }

  /**
   * Convert parameter name to CLI flag name (kebab-case)
   */
  private paramNameToFlagName(name: string): string {
    return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  /**
   * Convert TypeScript type to CLI flag type
   * Note: oclif uses 'integer' not 'number', and doesn't have 'json' type
   */
  private typeToFlagType(type: string): 'string' | 'integer' | 'boolean' {
    const normalized = type.toLowerCase();

    // Arrays should always be strings (user passes JSON array string)
    if (normalized.includes('[]') || normalized.includes('array')) {
      return 'string';
    }
    // Only use integer for simple number types, not union types
    if (normalized === 'number') {
      return 'integer';
    }
    if (normalized === 'boolean') {
      return 'boolean';
    }
    // Everything else (including complex types) as strings (user passes JSON string)
    return 'string';
  }

  /**
   * Generate example commands
   */
  private generateExamples(group: string, name: string, flags: FlagDefinition[]): string[] {
    const examples: string[] = [];
    const requiredFlags = flags.filter(f => f.required);

    // Basic example with required flags
    let basicExample = `uipath ${group} ${name}`;
    for (const flag of requiredFlags) {
      const exampleValue = this.getExampleValue(flag);
      basicExample += ` --${flag.name} ${exampleValue}`;
    }
    examples.push(basicExample);

    return examples;
  }

  /**
   * Get example value for a flag type
   */
  private getExampleValue(flag: FlagDefinition): string {
    if (flag.name.includes('id') || flag.name.includes('key')) {
      return '"abc-123"';
    }
    if (flag.name.includes('folder')) {
      return '123';
    }
    if (flag.type === 'integer') {
      return '10';
    }
    if (flag.type === 'boolean') {
      return '';
    }
    // For string types that might be JSON, provide an example
    if (flag.name.includes('data') || flag.name.includes('input') || flag.name.includes('args')) {
      return '\'{"key": "value"}\'';
    }
    return '"example"';
  }

  /**
   * Check if service should be included based on config
   */
  private shouldIncludeService(service: ServiceInfo): boolean {
    const { include, exclude } = this.config.services;

    // If include list is specified, only include those
    if (include.length > 0 && !include.includes(service.category)) {
      return false;
    }

    // Check exclude list
    if (exclude.includes(service.category) || exclude.includes(service.name)) {
      return false;
    }

    return true;
  }

  /**
   * Check if method should be included based on config
   */
  private shouldIncludeMethod(service: ServiceInfo, method: ServiceMethod): boolean {
    const { exclude, overrides } = this.config.methods;
    const fullName = `${service.name}.${method.name}`;

    // Check if explicitly skipped in overrides
    if (overrides[fullName]?.skip) {
      return false;
    }

    // Check exclude patterns
    for (const pattern of exclude) {
      if (this.matchesPattern(fullName, pattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Match a method name against a glob-like pattern
   */
  private matchesPattern(name: string, pattern: string): boolean {
    const regex = new RegExp(
      '^' + pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') + '$'
    );
    return regex.test(name);
  }

  /**
   * Get method override from config
   */
  private getMethodOverride(serviceName: string, methodName: string): MethodOverride | undefined {
    return this.config.methods.overrides[`${serviceName}.${methodName}`];
  }

  /**
   * Generate a single command file content (one file per command)
   */
  generateSingleCommandFile(command: GeneratedCommand, importPrefix: string): string {
    const className = this.toClassName(command.name);
    const clientPath = this.getClientPath(command);
    const methodCall = this.generateMethodCall(command, clientPath);

    // Generate flags object
    const flagsObj = command.flags.map(flag => {
      let flagDef = `    '${flag.name}': Flags.${flag.type}({\n`;
      flagDef += `      description: ${JSON.stringify(flag.description)},\n`;
      if (flag.required) {
        flagDef += `      required: true,\n`;
      }
      if (flag.char) {
        flagDef += `      char: '${flag.char}',\n`;
      }
      if (flag.default !== undefined) {
        const defaultVal = typeof flag.default === 'string' ? JSON.stringify(flag.default) : flag.default;
        flagDef += `      default: ${defaultVal},\n`;
      }
      flagDef += `    })`;
      return flagDef;
    }).join(',\n');

    // Generate examples
    const examplesArr = command.examples.map(ex => {
      const escaped = ex.replace(/'/g, "\\'");
      return `    '${escaped}'`;
    }).join(',\n');

    // Handle case when there are no flags
    const flagsSection = flagsObj
      ? `${flagsObj},\n    output: Flags.string({`
      : `output: Flags.string({`;

    return `/**
 * Auto-generated CLI Command: ${command.fullName}
 *
 * This file is generated by the CLI command generator.
 * DO NOT EDIT MANUALLY - changes will be overwritten.
 *
 * Generated at: ${new Date().toISOString()}
 * To regenerate: npm run generate
 */

import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { getSDKClient } from '${importPrefix}utils/sdk-client.js';
import { formatOutput } from '${importPrefix}utils/output-formatter.js';
import { track } from '${importPrefix}telemetry/index.js';

export default class ${className} extends Command {
  static description = ${JSON.stringify(command.description)};

  static examples = [
${examplesArr}
  ];

  static flags = {
    ${flagsSection}
      char: 'o',
      description: 'Output format (json, table, yaml)',
      options: ['json', 'table', 'yaml'],
      default: 'table'
    })
  };

  @track('${command.group}.${command.name}')
  async run(): Promise<void> {
    const { flags } = await this.parse(${className});
    const spinner = ora('Executing ${command.fullName}...').start();

    try {
      const client = await getSDKClient();
      ${methodCall}

      spinner.succeed('Operation completed');
      this.log(formatOutput(result, flags.output as 'json' | 'table' | 'yaml'));
    } catch (error) {
      spinner.fail('Operation failed');
      this.log(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
      this.exit(1);
    }
  }
}
`;
  }

  /**
   * Convert command name to class name
   */
  private toClassName(name: string): string {
    return name
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Get the client path for a command
   */
  private getClientPath(command: GeneratedCommand): string {
    const serviceToClientPath: Record<string, string> = {
      // Orchestrator services (flat)
      'ProcessService': 'client.processes',
      'AssetService': 'client.assets',
      'QueueService': 'client.queues',
      'BucketService': 'client.buckets',
      // Action Center (flat)
      'TaskService': 'client.tasks',
      // Data Fabric (flat)
      'EntityService': 'client.entities',
      // Maestro services (nested)
      'MaestroProcessesService': 'client.maestro.processes',
      'ProcessInstancesService': 'client.maestro.processes.instances',
      'ProcessIncidentsService': 'client.maestro.processes.incidents',
      'CasesService': 'client.maestro.cases',
      'CaseInstancesService': 'client.maestro.cases.instances'
    };

    return serviceToClientPath[command.serviceName] || 'client';
  }

  /**
   * Generate the method call code
   */
  private generateMethodCall(command: GeneratedCommand, clientPath: string): string {
    const methodName = command.methodName;

    // Map flag names back to parameter names
    const flagToParam = (flagName: string) => {
      return flagName.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    };

    // Pattern 1: getAll methods
    if (methodName === 'getAll') {
      if (['CasesService', 'MaestroProcessesService', 'ProcessIncidentsService', 'EntityService'].includes(command.serviceName)) {
        return `const result = await ${clientPath}.${methodName}();`;
      }
      return `const result = await ${clientPath}.${methodName}(flags as any);`;
    }

    // Pattern 2: getById methods
    if (methodName === 'getById') {
      if (command.serviceName === 'EntityService') {
        return `const result = await ${clientPath}.${methodName}(flags.id);`;
      }
      if (command.serviceName === 'TaskService') {
        return `const result = await ${clientPath}.${methodName}(flags.id, {}, flags['folder-id']);`;
      }
      if (command.serviceName === 'CaseInstancesService') {
        return `const result = await ${clientPath}.${methodName}(flags['instance-id'], flags['folder-key']);`;
      }
      if (command.serviceName === 'ProcessInstancesService') {
        return `const result = await ${clientPath}.${methodName}(flags.id, flags['folder-key']);`;
      }
      return `const result = await ${clientPath}.${methodName}(flags.id, flags['folder-id']);`;
    }

    // Pattern 3: start methods
    if (methodName === 'start') {
      return `const { 'folder-id': folderId, output, ...request } = flags;
      const result = await ${clientPath}.${methodName}(request as any, folderId);`;
    }

    // Pattern 4: create methods
    if (methodName === 'create') {
      return `const { 'folder-id': folderId, output, ...data } = flags;
      const result = await ${clientPath}.${methodName}(data as any, folderId);`;
    }

    // Pattern 5: complete methods
    if (methodName === 'complete') {
      return `const { 'folder-id': folderId, output, ...options } = flags;
      const result = await ${clientPath}.${methodName}(options as any, folderId);`;
    }

    // Pattern 6: Entity operations
    if (methodName === 'insertById' || methodName === 'updateById') {
      return `const result = await ${clientPath}.${methodName}(flags.id, JSON.parse(flags.data));`;
    }
    if (methodName === 'deleteById') {
      return `const result = await ${clientPath}.${methodName}(flags.id, JSON.parse(flags['record-ids']));`;
    }
    if (methodName === 'getRecordsById') {
      return `const result = await ${clientPath}.${methodName}(flags['entity-id'], flags as any);`;
    }

    // Pattern 7: assign/reassign/unassign
    if (methodName === 'assign' || methodName === 'reassign') {
      return `const result = await ${clientPath}.${methodName}(flags as any);`;
    }
    if (methodName === 'unassign') {
      return `const result = await ${clientPath}.${methodName}(JSON.parse(flags['task-ids']));`;
    }

    // Default: pass flags
    return `const result = await ${clientPath}.${methodName}(flags as any);`;
  }

  /**
   * Write generated command files
   */
  async writeCommandFiles(commands: GeneratedCommand[], outputPath: string): Promise<void> {
    // Create output directory
    const fullPath = path.resolve(outputPath);
    await fs.mkdir(fullPath, { recursive: true });

    // Write each command to its own file
    // oclif expects: group/command.ts structure
    // e.g., tasks/create.ts, tasks/list.ts, maestro/processes/list.ts
    for (const command of commands) {
      const group = command.group;
      let dirPath: string;
      let importPrefix: string;

      if (group.includes(' ')) {
        // Nested groups (e.g., "maestro case-instances" -> maestro/case-instances/)
        const parts = group.split(' ');
        dirPath = path.join(fullPath, ...parts);
        // Path: src/commands/generated/maestro/case-instances/cmd.ts
        // Need to reach: src/utils/
        // That's (1 + 1 + parts.length) = (2 + parts.length) levels up
        importPrefix = '../'.repeat(2 + parts.length);
      } else {
        // Flat groups (e.g., "tasks" -> tasks/)
        dirPath = path.join(fullPath, group);
        // Path: src/commands/generated/tasks/cmd.ts
        // Need to reach: src/utils/
        // That's 3 levels up
        importPrefix = '../../../';
      }

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${command.name}.ts`;
      const filePath = path.join(dirPath, fileName);
      const content = this.generateSingleCommandFile(command, importPrefix);

      await fs.writeFile(filePath, content, 'utf-8');
    }

    // Note: oclif discovers commands by file structure (directory = topic, file = command)
    // Each file exports a default class extending Command
  }
}

/**
 * Generate commands metadata JSON for debugging
 */
export function generateMetadataJson(commands: GeneratedCommand[]): string {
  return JSON.stringify(commands, null, 2);
}
