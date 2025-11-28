/**
 * CLI metadata system for SDK methods
 * 
 * This module provides decorators and utilities for marking SDK methods
 * as CLI commands and extracting their metadata for CLI command generation.
 */

/**
 * CLI parameter configuration
 */
export interface CliParameterConfig {
  /**
   * Parameter name as it appears in the method signature
   */
  name: string;

  /**
   * CLI flag/argument name (e.g., '--entity-id' or 'entity-id')
   * If not provided, will be auto-generated from parameter name
   */
  flag?: string;

  /**
   * Short flag character (e.g., 'e' for -e)
   */
  char?: string;

  /**
   * Description for the CLI flag/argument
   * If not provided, will be extracted from JSDoc @param
   */
  description?: string;

  /**
   * Whether this parameter is required
   * Default: true for non-optional parameters
   */
  required?: boolean;

  /**
   * Whether this should be a positional argument instead of a flag
   * Default: false (uses flag)
   */
  positional?: boolean;

  /**
   * Default value for the parameter
   */
  default?: any;

  /**
   * Options for enum/choice parameters
   */
  options?: string[];

  /**
   * Whether this parameter accepts multiple values
   */
  multiple?: boolean;

  /**
   * Type hint for CLI parsing (string, number, boolean, etc.)
   */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'json';
}

/**
 * Options for the @cliCommand decorator
 */
export interface CliCommandOptions {
  /**
   * The command name as it will appear in CLI
   * Should follow convention: {service} {method-name} (e.g., 'entities get-by-id')
   * For nested services: {service} {subservice} {method-name} (e.g., 'maestro cases get-all')
   * If not provided, will be auto-generated from service and method name
   */
  command?: string;

  /**
   * Human-readable description of what the command does
   * If not provided, will be extracted from JSDoc
   */
  description?: string;

  /**
   * Examples of command usage
   */
  examples?: string[];

  /**
   * Parameter configurations
   * Maps method parameter names to CLI flag/argument configurations
   */
  params?: CliParameterConfig[];

  /**
   * Whether this command should be included in CLI generation
   * Default: true
   */
  enabled?: boolean;

  /**
   * Aliases for the command (e.g., ['get', 'fetch'])
   */
  aliases?: string[];

  /**
   * Whether this command is hidden from help
   * Default: false
   */
  hidden?: boolean;
}

/**
 * Metadata stored on methods decorated with @cliCommand
 */
export interface CliCommandMetadata extends CliCommandOptions {
  /**
   * The method name (property key)
   */
  methodName: string;

  /**
   * The class name (service name)
   */
  className: string;

  /**
   * Full service path (e.g., 'entities', 'maestro.cases')
   */
  servicePath: string;

  /**
   * Full command path (e.g., 'entities get-by-id', 'maestro cases get-all')
   */
  commandPath: string;
}

/**
 * Symbol used to store CLI metadata on methods
 */
const CLI_METADATA_SYMBOL = Symbol('cliCommandMetadata');

/**
 * Symbol used to mark methods as CLI commands
 */
const CLI_COMMAND_SYMBOL = Symbol('cliCommand');

/**
 * Decorator to mark a method as a CLI command
 * 
 * @param options - CLI command configuration
 * @returns Method decorator
 * 
 * @example
 * ```typescript
 * @cliCommand({
 *   command: 'entities get-by-id',
 *   description: 'Get entity metadata by ID',
 *   params: [
 *     { name: 'id', positional: true, description: 'Entity UUID' }
 *   ]
 * })
 * async getById(id: string): Promise<EntityGetResponse> {
 *   // ...
 * }
 * ```
 */
export function cliCommand(options?: CliCommandOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (typeof propertyKey !== 'string') {
      throw new Error('CLI command decorator can only be used on methods with string property keys');
    }

    if (!descriptor.value) {
      throw new Error('CLI command decorator can only be used on methods');
    }

    // Auto-generate command path if not provided
    const className = target.constructor.name;
    const servicePath = classNameToServicePath(className);
    const commandPath = options?.command || generateCommandPath(servicePath, propertyKey);

    // Store metadata on the method
    const metadata: Partial<CliCommandMetadata> = {
      ...options,
      methodName: propertyKey,
      className,
      servicePath,
      commandPath,
      enabled: options?.enabled !== false
    };

    // Attach metadata to the method
    (descriptor.value as any)[CLI_METADATA_SYMBOL] = metadata;
    (descriptor.value as any)[CLI_COMMAND_SYMBOL] = true;

    return descriptor;
  };
}

/**
 * Check if a method is marked as a CLI command
 */
export function isCliCommand(method: any): boolean {
  return !!(method && (method as any)[CLI_COMMAND_SYMBOL]);
}

/**
 * Get CLI metadata from a method
 */
export function getCliCommandMetadata(method: any): CliCommandMetadata | null {
  if (!isCliCommand(method)) {
    return null;
  }
  return (method as any)[CLI_METADATA_SYMBOL] || null;
}

/**
 * Get all CLI commands from a service instance
 */
export function getCliCommandsFromService(serviceInstance: any): Map<string, CliCommandMetadata> {
  const commands = new Map<string, CliCommandMetadata>();

  // Get all property names from the instance
  const prototype = Object.getPrototypeOf(serviceInstance);
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const propertyName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (descriptor && typeof descriptor.value === 'function') {
      const method = descriptor.value;
      const metadata = getCliCommandMetadata(method);
      if (metadata && metadata.enabled) {
        commands.set(metadata.commandPath, metadata as CliCommandMetadata);
      }
    }
  }

  return commands;
}

/**
 * Get all CLI commands from a service class (before instantiation)
 */
export function getCliCommandsFromClass(serviceClass: any): Map<string, Partial<CliCommandMetadata>> {
  const commands = new Map<string, Partial<CliCommandMetadata>>();

  // Get all property names from the prototype
  const prototype = serviceClass.prototype;
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const propertyName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (descriptor && typeof descriptor.value === 'function') {
      const method = descriptor.value;
      const metadata = getCliCommandMetadata(method);
      if (metadata && metadata.enabled) {
        commands.set(metadata.commandPath!, metadata);
      }
    }
  }

  return commands;
}

/**
 * Convert class name to service path
 * Examples:
 * - EntityService -> 'entities'
 * - ProcessService -> 'processes'
 * - CasesService -> 'cases'
 */
function classNameToServicePath(className: string): string {
  // Remove 'Service' suffix if present
  const withoutService = className.replace(/Service$/, '');
  
  // Convert PascalCase to kebab-case
  return withoutService
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

/**
 * Generate command path from service path and method name
 * Examples:
 * - 'entities' + 'getById' -> 'entities get-by-id'
 * - 'maestro.cases' + 'getAll' -> 'maestro cases get-all'
 */
function generateCommandPath(servicePath: string, methodName: string): string {
  // Convert camelCase method name to kebab-case
  const methodKebab = methodName
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase();
  
  // Combine service path and method
  const serviceParts = servicePath.split('.');
  return [...serviceParts, methodKebab].join(' ');
}

