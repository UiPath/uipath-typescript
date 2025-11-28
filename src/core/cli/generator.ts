/**
 * CLI Command Generator
 * 
 * Utilities for generating OCLIF commands from SDK service methods
 */

import { CliCommandMetadata, CliParameterConfig } from './metadata';
// Note: @oclif/core is not a dependency of the SDK package
// It should be available in the CLI package where commands are generated

/**
 * OCLIF Flag definition
 * Note: This is a type definition only. The actual @oclif/core package
 * should be available in the CLI package where commands are generated.
 */
export interface OclifFlagDefinition {
  char?: string;
  description: string;
  required?: boolean;
  default?: any;
  options?: string[];
  multiple?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'json';
}

/**
 * Generated OCLIF command structure
 */
export interface GeneratedOclifCommand {
  /**
   * Command ID (e.g., 'entities:get-by-id')
   */
  id: string;

  /**
   * Command description
   */
  description: string;

  /**
   * Command examples
   */
  examples?: string[];

  /**
   * OCLIF flags definition
   */
  flags: Record<string, OclifFlagDefinition>;

  /**
   * Positional arguments (in order)
   */
  args: Array<{
    name: string;
    description: string;
    required: boolean;
  }>;

  /**
   * Aliases
   */
  aliases?: string[];

  /**
   * Whether command is hidden
   */
  hidden?: boolean;

  /**
   * Metadata for command execution
   */
  metadata: CliCommandMetadata;
}

/**
 * Generate OCLIF command structure from CLI metadata
 */
export function generateOclifCommand(metadata: CliCommandMetadata): GeneratedOclifCommand {
  // Convert command path to OCLIF command ID
  // 'entities get-by-id' -> 'entities:get-by-id'
  const commandId = metadata.commandPath.replace(/\s+/g, ':');

  // Extract flags and args from parameters
  const flags: Record<string, OclifFlagDefinition> = {};
  const args: Array<{ name: string; description: string; required: boolean }> = [];

  if (metadata.params) {
    for (const param of metadata.params) {
      const flagName = param.flag || paramToFlagName(param.name);
      const description = param.description || `Parameter: ${param.name}`;
      const required = param.required !== false;

      if (param.positional) {
        // Positional argument
        args.push({
          name: param.name,
          description,
          required
        });
      } else {
        // Flag
        flags[flagName] = {
          char: param.char,
          description,
          required,
          default: param.default,
          options: param.options,
          multiple: param.multiple,
          type: param.type || 'string'
        };
      }
    }
  }

  return {
    id: commandId,
    description: metadata.description || `Execute ${metadata.methodName}`,
    examples: metadata.examples,
    flags,
    args,
    aliases: metadata.aliases,
    hidden: metadata.hidden,
    metadata
  };
}

/**
 * Convert parameter name to flag name
 * Examples:
 * - 'entityId' -> 'entity-id'
 * - 'folderId' -> 'folder-id'
 */
function paramToFlagName(paramName: string): string {
  return paramName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();
}

/**
 * Generate OCLIF Command class code from metadata
 * This generates the actual TypeScript code for an OCLIF command
 */
export function generateOclifCommandClass(
  command: GeneratedOclifCommand,
  servicePath: string,
  methodName: string
): string {
  const className = commandIdToClassName(command.id);
  const flagsCode = generateFlagsCode(command.flags);
  const argsCode = generateArgsCode(command.args);
  const examplesCode = command.examples
    ? command.examples.map(ex => `    '${ex}'`).join(',\n')
    : '';

  return `import { Command, Flags } from '@oclif/core';
import { UiPath } from '@uipath/uipath-typescript';

export default class ${className} extends Command {
  static description = '${escapeString(command.description)}';

  static examples = [
${examplesCode || "    '<%= config.bin %> <%= command.id %>'"}
  ];

  static flags = {
    help: Flags.help({ char: 'h' }),
${flagsCode}
  };

  static args = [
${argsCode}
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(${className});
    
    // Initialize SDK
    const sdk = new UiPath({
      baseUrl: process.env.UIPATH_BASE_URL!,
      orgName: process.env.UIPATH_ORG_NAME!,
      tenantName: process.env.UIPATH_TENANT_NAME!,
      // Add other config from env
    });

    await sdk.initialize();

    // Call the SDK method
    const result = await sdk.${servicePath}.${methodName}(
      ${generateMethodCallArgs(command)}
    );

    // Output result
    this.log(JSON.stringify(result, null, 2));
  }
}
`;
}

/**
 * Generate flags code for OCLIF
 */
function generateFlagsCode(flags: Record<string, OclifFlagDefinition>): string {
  const lines: string[] = [];

  for (const [name, flag] of Object.entries(flags)) {
    const flagOptions: string[] = [];
    
    if (flag.char) {
      flagOptions.push(`char: '${flag.char}'`);
    }
    
    flagOptions.push(`description: '${escapeString(flag.description)}'`);
    
    if (flag.required !== undefined) {
      flagOptions.push(`required: ${flag.required}`);
    }
    
    if (flag.default !== undefined) {
      flagOptions.push(`default: ${JSON.stringify(flag.default)}`);
    }
    
    if (flag.options) {
      flagOptions.push(`options: [${flag.options.map(o => `'${o}'`).join(', ')}]`);
    }
    
    if (flag.multiple) {
      flagOptions.push(`multiple: true`);
    }

    const flagType = flag.type === 'boolean' ? 'boolean' : 
                     flag.type === 'number' ? 'integer' :
                     flag.type === 'array' ? 'string' :
                     'string';

    lines.push(`    ${name}: Flags.${flagType}({`);
    lines.push(`      ${flagOptions.join(',\n      ')}`);
    lines.push(`    }),`);
  }

  return lines.join('\n');
}

/**
 * Generate args code for OCLIF
 */
function generateArgsCode(args: Array<{ name: string; description: string; required: boolean }>): string {
  if (args.length === 0) {
    return '';
  }

  return args.map(arg => {
    return `    {
      name: '${arg.name}',
      description: '${escapeString(arg.description)}',
      required: ${arg.required}
    }`;
  }).join(',\n');
}

/**
 * Generate method call arguments
 */
function generateMethodCallArgs(command: GeneratedOclifCommand): string {
  const args: string[] = [];
  
  // Add positional arguments first
  for (const arg of command.args) {
    args.push(`args.${arg.name}`);
  }

  // Add flags as options object
  const flagNames = Object.keys(command.flags);
  if (flagNames.length > 0) {
    const options: string[] = flagNames.map(flag => {
      const flagName = flagToParamName(flag);
      return `      ${flagName}: flags.${flag}`;
    });
    args.push(`{\n${options.join(',\n')}\n    }`);
  }

  return args.join(',\n');
}

/**
 * Convert flag name to parameter name
 * 'entity-id' -> 'entityId'
 */
function flagToParamName(flagName: string): string {
  return flagName.split('-').map((part, i) => 
    i === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
  ).join('');
}

/**
 * Convert command ID to class name
 * 'entities:get-by-id' -> 'EntitiesGetById'
 */
function commandIdToClassName(commandId: string): string {
  return commandId
    .split(':')
    .map(part => part.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(''))
    .join('');
}

/**
 * Escape string for use in generated code
 */
function escapeString(str: string): string {
  return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

