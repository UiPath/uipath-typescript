/**
 * Composite Tool Generator
 *
 * Generates CLI commands and MCP tools for composite operations
 * that combine multiple SDK calls into a single tool.
 */

import {
  CompositeToolDefinition,
  CustomToolDefinition,
  ParameterDefinition
} from './generator-config.js';

/**
 * Generate CLI command class for a composite tool
 */
export function generateCompositeCliCommand(
  composite: CompositeToolDefinition,
  importPrefix: string
): string {
  const className = toPascalCase(composite.cliName);
  const flags = generateFlagsFromParameters(composite.parameters);
  const stepsCode = generateStepsCode(composite.steps, composite.returns);

  return `/**
 * Composite CLI Command: ${composite.cliName}
 * ${composite.description}
 *
 * This is a composite command that combines multiple SDK calls.
 * Generated from generator config.
 */

import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { getSDKClient } from '${importPrefix}utils/sdk-client.js';
import { formatOutput } from '${importPrefix}utils/output-formatter.js';

export default class ${className} extends Command {
  static description = ${JSON.stringify(composite.description)};

  static examples = [
    'uipath ${composite.cliGroup} ${composite.cliName}'
  ];

  static flags = {
${flags}
    output: Flags.string({
      char: 'o',
      description: 'Output format (json, table, yaml)',
      options: ['json', 'table', 'yaml'],
      default: 'table'
    })
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(${className});
    const spinner = ora('Executing ${composite.cliName}...').start();

    try {
      const client = await getSDKClient();

${stepsCode}

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
 * Generate MCP tool definition for a composite tool
 */
export function generateCompositeMcpTool(
  composite: CompositeToolDefinition
): string {
  const zodSchema = generateZodSchema(composite.parameters);
  const stepsCode = generateStepsCode(composite.steps, composite.returns, true);

  return `/**
 * Composite MCP Tool: ${composite.mcpName}
 * ${composite.description}
 */
export const ${toCamelCase(composite.mcpName)}Tool = {
  name: '${composite.mcpName}',
  description: ${JSON.stringify(composite.description)},
  inputSchema: ${zodSchema},
  execute: async (args: Record<string, unknown>, client: SDKClient) => {
${stepsCode}
    return result;
  }
};
`;
}

/**
 * Generate CLI command for a custom tool
 */
export function generateCustomCliCommand(
  custom: CustomToolDefinition,
  importPrefix: string
): string {
  const className = toPascalCase(custom.cliName);
  const flags = generateFlagsFromParameters(custom.parameters);

  return `/**
 * Custom CLI Command: ${custom.cliName}
 * ${custom.description}
 *
 * This is a custom command with its own handler.
 * Handler: ${custom.handler}
 */

import { Command, Flags } from '@oclif/core';
import chalk from 'chalk';
import ora from 'ora';
import { getSDKClient } from '${importPrefix}utils/sdk-client.js';
import { formatOutput } from '${importPrefix}utils/output-formatter.js';
import { execute as customHandler } from '${importPrefix}${custom.handler.replace('.ts', '.js')}';

export default class ${className} extends Command {
  static description = ${JSON.stringify(custom.description)};

  static examples = [
    'uipath ${custom.cliGroup} ${custom.cliName}'
  ];

  static flags = {
${flags}
    output: Flags.string({
      char: 'o',
      description: 'Output format (json, table, yaml)',
      options: ['json', 'table', 'yaml'],
      default: 'table'
    })
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(${className});
    const spinner = ora('Executing ${custom.cliName}...').start();

    try {
      const client = await getSDKClient();
      const { output, ...params } = flags;
      const result = await customHandler(params, client);

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
 * Generate MCP tool for a custom tool
 */
export function generateCustomMcpTool(
  custom: CustomToolDefinition
): string {
  const zodSchema = generateZodSchema(custom.parameters);

  return `/**
 * Custom MCP Tool: ${custom.mcpName}
 * ${custom.description}
 * Handler: ${custom.handler}
 */
export const ${toCamelCase(custom.mcpName)}Tool = {
  name: '${custom.mcpName}',
  description: ${JSON.stringify(custom.description)},
  inputSchema: ${zodSchema},
  handler: '${custom.handler}'
};
`;
}

/**
 * Generate flags from parameter definitions
 */
function generateFlagsFromParameters(parameters: Record<string, ParameterDefinition>): string {
  const flags: string[] = [];

  for (const [name, param] of Object.entries(parameters)) {
    const flagName = toKebabCase(name);
    const flagType = paramTypeToFlagType(param.type);

    let flagDef = `    '${flagName}': Flags.${flagType}({\n`;
    flagDef += `      description: ${JSON.stringify(param.description || `${name} parameter`)},\n`;

    if (param.required) {
      flagDef += `      required: true,\n`;
    }

    if (param.default !== undefined) {
      flagDef += `      default: ${JSON.stringify(param.default)},\n`;
    }

    flagDef += `    }),`;
    flags.push(flagDef);
  }

  return flags.join('\n');
}

/**
 * Generate Zod schema from parameter definitions
 */
function generateZodSchema(parameters: Record<string, ParameterDefinition>): string {
  const fields: string[] = [];

  for (const [name, param] of Object.entries(parameters)) {
    let zodType = paramTypeToZodType(param);

    if (param.description) {
      zodType += `.describe(${JSON.stringify(param.description)})`;
    }

    if (!param.required) {
      zodType += '.optional()';
    }

    if (param.default !== undefined) {
      zodType += `.default(${JSON.stringify(param.default)})`;
    }

    fields.push(`    ${name}: ${zodType}`);
  }

  return `z.object({\n${fields.join(',\n')}\n  })`;
}

/**
 * Generate code for composite steps
 */
function generateStepsCode(
  steps: CompositeToolDefinition['steps'],
  returns: string,
  isMcp: boolean = false
): string {
  const lines: string[] = [];
  const indent = isMcp ? '    ' : '      ';

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const [serviceName, methodName] = step.call.split('.');
    const clientPath = getClientPath(serviceName);

    // Generate arguments
    const args = step.args.map(arg => {
      if (typeof arg === 'string') {
        // Reference to input parameter or previous step output
        if (isMcp) {
          return `args.${toCamelCase(arg)}`;
        }
        return `flags['${toKebabCase(arg)}']`;
      }
      if ('literal' in arg) {
        return JSON.stringify(arg.literal);
      }
      if ('from' in arg) {
        return arg.from;
      }
      return 'undefined';
    }).join(', ');

    const varName = step.output || `step${i + 1}Result`;
    lines.push(`${indent}const ${varName} = await ${clientPath}.${methodName}(${args});`);
  }

  // Add return statement
  lines.push('');
  lines.push(`${indent}const result = ${returns};`);

  return lines.join('\n');
}

/**
 * Get SDK client path for a service
 */
function getClientPath(serviceName: string): string {
  const serviceToPath: Record<string, string> = {
    'TaskService': 'client.tasks',
    'EntityService': 'client.entities',
    'ProcessService': 'client.processes',
    'AssetService': 'client.assets',
    'QueueService': 'client.queues',
    'BucketService': 'client.buckets',
    'MaestroProcessesService': 'client.maestro.processes',
    'ProcessInstancesService': 'client.maestro.processes.instances',
    'CasesService': 'client.maestro.cases',
    'CaseInstancesService': 'client.maestro.cases.instances'
  };

  return serviceToPath[serviceName] || `client.${toCamelCase(serviceName.replace('Service', ''))}`;
}

/**
 * Convert parameter type to oclif flag type
 */
function paramTypeToFlagType(type: string): string {
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
 * Convert parameter type to Zod type
 */
function paramTypeToZodType(param: ParameterDefinition): string {
  switch (param.type) {
    case 'string':
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'array':
      if (param.items) {
        return `z.array(${paramTypeToZodType(param.items)})`;
      }
      return 'z.array(z.unknown())';
    case 'object':
      if (param.properties) {
        const props = Object.entries(param.properties)
          .map(([k, v]) => `${k}: ${paramTypeToZodType(v)}`)
          .join(', ');
        return `z.object({ ${props} })`;
      }
      return 'z.object({}).passthrough()';
    default:
      return 'z.unknown()';
  }
}

/**
 * String case conversions
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/_/g, '-');
}
