/**
 * MCP (Model Context Protocol) metadata system for SDK methods
 * 
 * This module provides decorators and utilities for marking SDK methods
 * as MCP tools and extracting their metadata for MCP server generation.
 */

/**
 * Options for the @mcpTool decorator
 */
export interface McpToolOptions {
  /**
   * The name of the tool as it will appear in MCP
   * Should follow convention: {service}_{methodName} (e.g., 'entities_getById')
   * For nested services: {service}.{subservice}_{methodName} (e.g., 'maestro.cases_getAll')
   */
  name: string;

  /**
   * Human-readable description of what the tool does
   * If not provided, will be extracted from JSDoc
   */
  description?: string;

  /**
   * Whether this tool should be included in MCP server generation
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Metadata stored on methods decorated with @mcpTool
 */
export interface McpToolMetadata extends McpToolOptions {
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
}

/**
 * Symbol used to store MCP metadata on methods
 */
const MCP_METADATA_SYMBOL = Symbol('mcpToolMetadata');

/**
 * Symbol used to mark methods as MCP tools
 */
const MCP_TOOL_SYMBOL = Symbol('mcpTool');

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
 * Decorator to mark a method as an MCP tool
 * 
 * @param options - MCP tool configuration
 * @returns Method decorator
 * 
 * @example
 * ```typescript
 * @mcpTool({
 *   name: 'entities_getById',
 *   description: 'Gets entity metadata by entity ID'
 * })
 * async getById(id: string): Promise<EntityGetResponse> {
 *   // ...
 * }
 * ```
 */
export function mcpTool(options: McpToolOptions): MethodDecorator {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    if (typeof propertyKey !== 'string') {
      throw new Error('MCP tool decorator can only be used on methods with string property keys');
    }

    // Calculate service path from class name
    const className = target.constructor.name;
    const servicePath = classNameToServicePath(className);

    // Store metadata on the method
    const metadata: Partial<McpToolMetadata> = {
      ...options,
      methodName: propertyKey,
      className,
      servicePath,
      enabled: options.enabled !== false
    };

    // Store metadata using symbol
    if (!descriptor.value) {
      throw new Error('MCP tool decorator can only be used on methods');
    }

    // Attach metadata to the method
    (descriptor.value as any)[MCP_METADATA_SYMBOL] = metadata;
    (descriptor.value as any)[MCP_TOOL_SYMBOL] = true;

    return descriptor;
  };
}

/**
 * Check if a method is marked as an MCP tool
 */
export function isMcpTool(method: any): boolean {
  return !!(method && (method as any)[MCP_TOOL_SYMBOL]);
}

/**
 * Get MCP metadata from a method
 */
export function getMcpToolMetadata(method: any): McpToolMetadata | null {
  if (!isMcpTool(method)) {
    return null;
  }
  return (method as any)[MCP_METADATA_SYMBOL] || null;
}

/**
 * Get all MCP tools from a service instance
 */
export function getMcpToolsFromService(serviceInstance: any): Map<string, McpToolMetadata> {
  const tools = new Map<string, McpToolMetadata>();

  // Get all property names from the instance
  const prototype = Object.getPrototypeOf(serviceInstance);
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const propertyName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (descriptor && typeof descriptor.value === 'function') {
      const method = descriptor.value;
      const metadata = getMcpToolMetadata(method);
      if (metadata && metadata.enabled !== false) {
        tools.set(metadata.name, metadata);
      }
    }
  }

  return tools;
}

/**
 * Get all MCP tools from a service class (before instantiation)
 */
export function getMcpToolsFromClass(serviceClass: any): Map<string, Partial<McpToolMetadata>> {
  const tools = new Map<string, Partial<McpToolMetadata>>();

  // Get all property names from the prototype
  const prototype = serviceClass.prototype;
  const propertyNames = Object.getOwnPropertyNames(prototype);

  for (const propertyName of propertyNames) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    if (descriptor && typeof descriptor.value === 'function') {
      const method = descriptor.value;
      const metadata = getMcpToolMetadata(method);
      if (metadata && metadata.enabled !== false) {
        tools.set(metadata.name, metadata);
      }
    }
  }

  return tools;
}

