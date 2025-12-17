/**
 * CLI Command Generator
 *
 * Generates oclif CLI commands from parsed SDK services.
 * Integrates with generator config for customization.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ParsedSDK,
  ServiceInfo,
  ServiceMethod,
  serviceNameToCommandGroup,
  methodToCommandName
} from './service-parser.js';
import {
  GeneratorConfig,
  defaultConfig,
  MethodOverride,
  CompositeTool,
  CustomTool
} from './config.schema.js';
import { shouldSkipMethod, getMethodOverride, getServiceConfig } from './config.loader.js';

export interface GeneratedCommand {
  name: string;
  fullName: string;
  group: string;
  description: string;
  flags: FlagDefinition[];
  examples: string[];
  serviceName: string;
  methodName: string;
  isComposite?: boolean;
  isCustom?: boolean;
}

export interface FlagDefinition {
  name: string;
  type: 'string' | 'integer' | 'boolean';
  description: string;
  required: boolean;
  char?: string;
  default?: unknown;
}

/**
 * Command Generator class
 */
export class CommandGenerator {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig = defaultConfig) {
    this.config = config;
  }

  /**
   * Generate commands from parsed SDK
   */
  generateCommands(parsedSDK: ParsedSDK): GeneratedCommand[] {
    const commands: GeneratedCommand[] = [];

    // Generate commands from SDK services
    for (const service of parsedSDK.services) {
      const serviceCommands = this.generateServiceCommands(service);
      commands.push(...serviceCommands);
    }

    // Generate composite commands from config
    if (this.config.composites) {
      for (const composite of this.config.composites) {
        if (composite.targets?.includes('cli') !== false) {
          const cmd = this.generateCompositeCommand(composite);
          if (cmd) commands.push(cmd);
        }
      }
    }

    // Generate custom commands from config
    if (this.config.custom) {
      for (const custom of this.config.custom) {
        if (custom.targets?.includes('cli') !== false) {
          const cmd = this.generateCustomCommand(custom);
          if (cmd) commands.push(cmd);
        }
      }
    }

    return commands;
  }

  /**
   * Generate commands for a single service
   */
  private generateServiceCommands(service: ServiceInfo): GeneratedCommand[] {
    const commands: GeneratedCommand[] = [];

    // Check service-level config
    const serviceConfig = getServiceConfig(this.config, service.name);
    if (serviceConfig?.skip) {
      return commands;
    }

    // Get command group (can be overridden)
    const defaultGroup = serviceNameToCommandGroup(service.name);
    const group = serviceConfig?.cliGroup || defaultGroup;

    for (const method of service.methods) {
      // Check if method should be skipped
      if (shouldSkipMethod(this.config, service.name, method.name, 'cli')) {
        continue;
      }

      const command = this.generateCommand(service, method, group);
      if (command) {
        commands.push(command);
      }
    }

    return commands;
  }

  /**
   * Generate a single command from a method
   */
  private generateCommand(
    service: ServiceInfo,
    method: ServiceMethod,
    group: string
  ): GeneratedCommand {
    // Get method override from config
    const override = getMethodOverride(this.config, service.name, method.name);
    const cliOverride = override?.cli;

    // Determine command name
    const defaultName = methodToCommandName(method.name);
    const name = cliOverride?.name || defaultName;

    // Determine description
    const description = cliOverride?.description || method.description;

    // Generate flags
    const flags = this.generateFlags(method, cliOverride);

    // Generate examples
    const examples = this.generateExamples(group, name, flags);

    return {
      name,
      fullName: `${group} ${name}`,
      group: cliOverride?.group || group,
      description,
      flags,
      examples,
      serviceName: service.name,
      methodName: method.name
    };
  }

  /**
   * Generate flags from method parameters
   */
  private generateFlags(
    method: ServiceMethod,
    cliOverride?: MethodOverride['cli']
  ): FlagDefinition[] {
    const flags: FlagDefinition[] = [];

    for (const param of method.parameters) {
      // Skip 'this' and internal params
      if (param.name === 'this' || param.name.startsWith('_')) {
        continue;
      }

      // Get parameter override
      const paramOverride = cliOverride?.parameters?.[param.name];

      const flagName = paramOverride?.name || this.paramNameToFlagName(param.name);
      const flagType = this.typeToFlagType(param.type);

      flags.push({
        name: flagName,
        type: flagType,
        description: paramOverride?.description || param.description || `${param.name} parameter`,
        required: paramOverride?.required ?? !param.isOptional,
        char: paramOverride?.char,
        default: param.defaultValue
      });
    }

    return flags;
  }

  /**
   * Generate composite command
   */
  private generateCompositeCommand(composite: CompositeTool): GeneratedCommand {
    const flags: FlagDefinition[] = [];

    for (const [paramName, paramDef] of Object.entries(composite.parameters)) {
      flags.push({
        name: this.paramNameToFlagName(paramName),
        type: this.paramTypeToFlagType(paramDef.type),
        description: paramDef.description || `${paramName} parameter`,
        required: paramDef.required ?? true,
        default: paramDef.default
      });
    }

    const group = composite.cliGroup || 'composite';
    const name = this.toKebabCase(composite.name);

    return {
      name,
      fullName: `${group} ${name}`,
      group,
      description: composite.description,
      flags,
      examples: [`uipath ${group} ${name}`],
      serviceName: 'Composite',
      methodName: composite.name,
      isComposite: true
    };
  }

  /**
   * Generate custom command
   */
  private generateCustomCommand(custom: CustomTool): GeneratedCommand {
    const flags: FlagDefinition[] = [];

    for (const [paramName, paramDef] of Object.entries(custom.parameters)) {
      flags.push({
        name: this.paramNameToFlagName(paramName),
        type: this.paramTypeToFlagType(paramDef.type),
        description: paramDef.description || `${paramName} parameter`,
        required: paramDef.required ?? true,
        default: paramDef.default
      });
    }

    const group = custom.cliGroup || 'custom';
    const name = this.toKebabCase(custom.name);

    return {
      name,
      fullName: `${group} ${name}`,
      group,
      description: custom.description,
      flags,
      examples: [`uipath ${group} ${name}`],
      serviceName: 'Custom',
      methodName: custom.name,
      isCustom: true
    };
  }

  /**
   * Convert parameter name to flag name (kebab-case)
   */
  private paramNameToFlagName(name: string): string {
    return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  /**
   * Convert TypeScript type to flag type
   */
  private typeToFlagType(type: string): 'string' | 'integer' | 'boolean' {
    const normalized = type.toLowerCase();

    // Arrays should be strings (JSON input)
    if (normalized.includes('[]') || normalized.includes('array')) {
      return 'string';
    }
    // Only simple number types
    if (normalized === 'number') {
      return 'integer';
    }
    if (normalized === 'boolean') {
      return 'boolean';
    }
    return 'string';
  }

  /**
   * Convert parameter definition type to flag type
   */
  private paramTypeToFlagType(type: string): 'string' | 'integer' | 'boolean' {
    switch (type) {
      case 'number':
        return 'integer';
      case 'boolean':
        return 'boolean';
      default:
        return 'string';
    }
  }

  /**
   * Convert to kebab-case
   */
  private toKebabCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '')
      .replace(/_/g, '-');
  }

  /**
   * Generate example commands
   */
  private generateExamples(group: string, name: string, flags: FlagDefinition[]): string[] {
    const examples: string[] = [];
    const requiredFlags = flags.filter(f => f.required);

    let example = `uipath ${group} ${name}`;
    for (const flag of requiredFlags.slice(0, 2)) {
      example += ` --${flag.name} ${this.getExampleValue(flag.type)}`;
    }

    examples.push(example);
    return examples;
  }

  /**
   * Get example value for a type
   */
  private getExampleValue(type: string): string {
    switch (type) {
      case 'integer':
        return '"123"';
      case 'boolean':
        return 'true';
      default:
        return '"example"';
    }
  }

  /**
   * Get SDK client path for a service
   */
  private getClientPath(serviceName: string): string {
    const serviceToPath: Record<string, string> = {
      'ProcessService': 'client.processes',
      'AssetService': 'client.assets',
      'QueueService': 'client.queues',
      'BucketService': 'client.buckets',
      'TaskService': 'client.tasks',
      'EntityService': 'client.entities',
      'MaestroProcessesService': 'client.maestro.processes',
      'ProcessInstancesService': 'client.maestro.processes.instances',
      'ProcessIncidentsService': 'client.maestro.processes.incidents',
      'CasesService': 'client.maestro.cases',
      'CaseInstancesService': 'client.maestro.cases.instances'
    };
    return serviceToPath[serviceName] || 'client';
  }

  /**
   * Generate a single command file
   */
  generateSingleCommandFile(command: GeneratedCommand, importPrefix: string): string {
    const className = this.toPascalCase(command.name);
    const clientPath = this.getClientPath(command.serviceName);
    const methodCall = this.generateMethodCall(command, clientPath);

    // Generate flags
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
        flagDef += `      default: ${JSON.stringify(flag.default)},\n`;
      }
      flagDef += `    })`;
      return flagDef;
    }).join(',\n');

    // Generate examples
    const examplesArr = command.examples.map(ex => {
      const escaped = ex.replace(/'/g, "\\'");
      return `    '${escaped}'`;
    }).join(',\n');

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
      default: '${this.config.settings?.defaultCliOutput || 'table'}'
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
   * Generate method call code
   */
  private generateMethodCall(command: GeneratedCommand, clientPath: string): string {
    const methodName = command.methodName;

    // Handle composite tools
    if (command.isComposite) {
      return this.generateCompositeMethodCall(command);
    }

    // Handle custom tools
    if (command.isCustom) {
      return `const result = await customHandler(flags, client);`;
    }

    // Standard SDK method calls
    if (methodName === 'getAll') {
      if (['CasesService', 'MaestroProcessesService', 'ProcessIncidentsService', 'EntityService'].includes(command.serviceName)) {
        return `const result = await ${clientPath}.${methodName}();`;
      }
      return `const result = await ${clientPath}.${methodName}(flags as any);`;
    }

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
      return `const result = await ${clientPath}.${methodName}(flags.id);`;
    }

    // Default: pass flags as arguments
    return `const { 'folder-id': folderId, output, ...data } = flags;
      const result = await ${clientPath}.${methodName}(data as any${command.flags.some(f => f.name === 'folder-id') ? ', folderId' : ''});`;
  }

  /**
   * Generate composite method call
   */
  private generateCompositeMethodCall(command: GeneratedCommand): string {
    const composite = this.config.composites?.find(c => c.name === command.methodName);
    if (!composite) {
      return `const result = { error: 'Composite not found' };`;
    }

    const lines: string[] = [];
    for (let i = 0; i < composite.steps.length; i++) {
      const step = composite.steps[i];
      const [serviceName] = step.call.split('.');
      const clientPath = this.getClientPath(serviceName + 'Service');
      const methodName = step.call.split('.')[1];

      const args = step.args.map(arg => {
        if (typeof arg === 'string') {
          return `flags['${this.paramNameToFlagName(arg)}']`;
        }
        return JSON.stringify(arg);
      }).join(', ');

      const varName = step.output || `step${i + 1}Result`;
      lines.push(`const ${varName} = await ${clientPath}.${methodName}(${args});`);
    }

    const returnVar = composite.returns?.value || 'step1Result';
    lines.push(`const result = ${returnVar};`);

    return lines.join('\n      ');
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  /**
   * Write command files to disk
   */
  async writeCommandFiles(commands: GeneratedCommand[], outputPath: string): Promise<void> {
    const fullPath = path.resolve(outputPath);
    await fs.mkdir(fullPath, { recursive: true });

    for (const command of commands) {
      const group = command.group;
      let dirPath: string;
      let importPrefix: string;

      if (group.includes(' ')) {
        // Nested groups (e.g., "maestro processes" -> maestro/processes/)
        const parts = group.split(' ');
        dirPath = path.join(fullPath, ...parts);
        // Path: src/commands/maestro/processes/cmd.ts -> src/utils/
        // Need to go up (1 + parts.length) levels
        importPrefix = '../'.repeat(1 + parts.length);
      } else {
        // Flat groups (e.g., "tasks" -> tasks/)
        dirPath = path.join(fullPath, group);
        // Path: src/commands/tasks/cmd.ts -> src/utils/
        // Need to go up 2 levels
        importPrefix = '../../';
      }

      await fs.mkdir(dirPath, { recursive: true });

      const fileName = `${command.name}.ts`;
      const filePath = path.join(dirPath, fileName);
      const content = this.generateSingleCommandFile(command, importPrefix);

      await fs.writeFile(filePath, content, 'utf-8');
    }
  }
}

/**
 * Generate metadata JSON for debugging
 */
export function generateMetadataJson(commands: GeneratedCommand[]): string {
  return JSON.stringify(commands, null, 2);
}
