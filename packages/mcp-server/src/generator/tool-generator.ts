/**
 * MCP Tool Generator
 *
 * Generates MCP tool registration code from parsed SDK service metadata.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ServiceInfo, ServiceMethod, ParsedSDK } from './service-parser.js';
import { methodToToolName } from './service-parser.js';
import { parametersToZodSchema, typeToZod } from './schema-converter.js';
import type { MCPGeneratorConfig, MethodOverride } from './config.js';

export interface GeneratedTool {
  name: string;
  title: string;
  description: string;
  inputSchema: string;
  category: string;
  serviceName: string;
  methodName: string;
}

/**
 * Generate MCP tools from parsed SDK
 */
export class ToolGenerator {
  private config: MCPGeneratorConfig;

  constructor(config: MCPGeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate all tools from parsed SDK metadata
   */
  generateTools(parsedSDK: ParsedSDK): GeneratedTool[] {
    const tools: GeneratedTool[] = [];

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

        const tool = this.generateTool(service, method);
        if (tool) {
          tools.push(tool);
        }
      }
    }

    return tools;
  }

  /**
   * Generate a single tool from a service method
   */
  private generateTool(service: ServiceInfo, method: ServiceMethod): GeneratedTool {
    const toolName = this.getToolName(service, method);
    const override = this.getMethodOverride(service.name, method.name);

    // Generate title from method name
    const title = override?.title || this.generateTitle(method.name, service.name);

    // Get description (from override, JSDoc, or generate)
    const description = override?.description ||
      this.config.descriptions[toolName] ||
      method.description ||
      `${method.name} operation for ${service.name}`;

    // Generate input schema
    const inputSchema = this.generateInputSchema(method, override);

    return {
      name: toolName,
      title,
      description,
      inputSchema,
      category: service.category,
      serviceName: service.name,
      methodName: method.name
    };
  }

  /**
   * Get tool name based on config
   */
  private getToolName(service: ServiceInfo, method: ServiceMethod): string {
    const override = this.getMethodOverride(service.name, method.name);
    if (override?.toolName) {
      return override.toolName;
    }

    return methodToToolName(
      method.name,
      service.name,
      service.category,
      this.config.naming.separator
    );
  }

  /**
   * Generate human-readable title from method name
   */
  private generateTitle(methodName: string, serviceName: string): string {
    // Convert camelCase to Title Case
    const words = methodName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    // Add context for common operations
    const title = words.join(' ');

    if (methodName === 'getAll') {
      return `List ${serviceName.replace('Service', '')}s`;
    }
    if (methodName === 'getById') {
      return `Get ${serviceName.replace('Service', '')} by ID`;
    }
    if (methodName === 'create') {
      return `Create ${serviceName.replace('Service', '')}`;
    }
    if (methodName === 'update') {
      return `Update ${serviceName.replace('Service', '')}`;
    }
    if (methodName === 'delete') {
      return `Delete ${serviceName.replace('Service', '')}`;
    }

    return title;
  }

  /**
   * Generate Zod input schema for method parameters
   */
  private generateInputSchema(method: ServiceMethod, override?: MethodOverride): string {
    const schema = parametersToZodSchema(method.parameters);

    // Apply overrides if present
    if (override?.inputSchema) {
      for (const [paramName, paramOverride] of Object.entries(override.inputSchema)) {
        if (schema.properties[paramName]) {
          if (paramOverride.description) {
            // Update description
            const prop = schema.properties[paramName];
            prop.zodType = prop.zodType.replace(
              /\.describe\([^)]+\)/,
              `.describe(${JSON.stringify(paramOverride.description)})`
            );
            if (!prop.zodType.includes('.describe(')) {
              prop.zodType += `.describe(${JSON.stringify(paramOverride.description)})`;
            }
          }
          if (paramOverride.required !== undefined) {
            // Update optionality
            if (paramOverride.required && schema.properties[paramName].isOptional) {
              schema.properties[paramName].zodType = schema.properties[paramName].zodType
                .replace('.optional()', '');
              schema.properties[paramName].isOptional = false;
            }
          }
        }
      }
    }

    return schema.zodCode;
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
    // Convert pattern to regex
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
   * Generate the full sdk-tools.ts file content
   */
  generateToolsFile(tools: GeneratedTool[]): string {
    const imports = `/**
 * Auto-generated SDK Tools
 *
 * This file is generated by the MCP tool generator.
 * DO NOT EDIT MANUALLY - changes will be overwritten.
 *
 * Generated at: ${new Date().toISOString()}
 * Tool count: ${tools.length}
 *
 * To regenerate: npm run generate
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { UiPathClient } from '../../server/index.js';
`;

    // Group tools by category
    const toolsByCategory = new Map<string, GeneratedTool[]>();
    for (const tool of tools) {
      const category = tool.category;
      if (!toolsByCategory.has(category)) {
        toolsByCategory.set(category, []);
      }
      toolsByCategory.get(category)!.push(tool);
    }

    // Generate registration code
    let registrationCode = `
/**
 * Register all SDK-based MCP tools
 */
export function registerSDKTools(server: McpServer, client: UiPathClient): void {
`;

    for (const [category, categoryTools] of toolsByCategory) {
      const categoryTitle = category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      registrationCode += `
  // ============================================
  // ${categoryTitle}
  // ============================================
`;

      for (const tool of categoryTools) {
        registrationCode += this.generateToolRegistration(tool);
      }
    }

    registrationCode += `}
`;

    return imports + registrationCode;
  }

  /**
   * Generate registration code for a single tool
   */
  private generateToolRegistration(tool: GeneratedTool): string {
    // Determine the client path based on category and service
    const clientPath = this.getClientPath(tool);

    // Generate appropriate method call based on method signature pattern
    const methodCall = this.generateMethodCall(tool, clientPath);

    return `
  server.tool(
    '${tool.name}',
    ${JSON.stringify(tool.description)},
    ${tool.inputSchema},
    async (params) => {
      try {
        ${methodCall}
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{ type: 'text', text: \`Error: \${message}\` }],
          isError: true
        };
      }
    }
  );
`;
  }

  /**
   * Generate the method call code based on method signature patterns
   *
   * SDK methods follow different patterns:
   * 1. Options-only: getAll(options?) - pass params directly
   * 2. ID + folderId + options: getById(id, folderId, options?) - extract positional args
   * 3. Request + folderId: start(request, folderId) - extract folderId
   *
   * Note: We use `as any` casts to bypass TypeScript's strict type checking
   * because the Zod schema output types don't exactly match SDK parameter types.
   * Runtime validation is still performed by the SDK.
   */
  private generateMethodCall(tool: GeneratedTool, clientPath: string): string {
    const methodName = tool.methodName;

    // Pattern 1: getAll methods - pass params object directly (or no params)
    if (methodName === 'getAll') {
      // Some getAll methods take no arguments
      if (tool.serviceName === 'CasesService' ||
          tool.serviceName === 'MaestroProcessesService' ||
          tool.serviceName === 'ProcessIncidentsService' ||
          tool.serviceName === 'EntityService') {
        return `const result = await ${clientPath}.${methodName}();`;
      }
      return `const result = await ${clientPath}.${methodName}(params as any);`;
    }

    // Pattern 2: getById methods - various signatures
    if (methodName === 'getById') {
      // EntityService.getById(id)
      if (tool.serviceName === 'EntityService') {
        return `const result = await ${clientPath}.${methodName}((params as any).id);`;
      }
      // TaskService.getById(id, options?, folderId?)
      if (tool.serviceName === 'TaskService') {
        return `const result = await ${clientPath}.${methodName}((params as any).id, {}, (params as any).folderId);`;
      }
      // CaseInstancesService.getById(instanceId, folderKey)
      if (tool.serviceName === 'CaseInstancesService') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId, (params as any).folderKey);`;
      }
      // ProcessInstancesService.getById(id, folderKey)
      if (tool.serviceName === 'ProcessInstancesService') {
        return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).folderKey);`;
      }
      // Default: (id, folderId, options?)
      return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).folderId);`;
    }

    // Pattern 3: start methods - (request, folderId)
    if (methodName === 'start') {
      return `const { folderId, ...request } = params as any;
        const result = await ${clientPath}.${methodName}(request, folderId);`;
    }

    // Pattern 4: create methods - (data, folderId)
    if (methodName === 'create') {
      return `const { folderId, ...data } = params as any;
        const result = await ${clientPath}.${methodName}(data, folderId);`;
    }

    // Pattern 5: complete methods - (options, folderId)
    if (methodName === 'complete') {
      return `const { folderId, ...options } = params as any;
        const result = await ${clientPath}.${methodName}(options, folderId);`;
    }

    // Pattern 6: CaseInstances methods with instanceId + folderKey
    if (tool.serviceName === 'CaseInstancesService') {
      if (methodName === 'close') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId, (params as any).folderKey, (params as any).options);`;
      }
      if (methodName === 'pause' || methodName === 'resume') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId, (params as any).folderKey, (params as any).options);`;
      }
      if (methodName === 'getExecutionHistory' || methodName === 'getStages') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId || (params as any).caseInstanceId, (params as any).folderKey);`;
      }
      if (methodName === 'getActionTasks') {
        return `const result = await ${clientPath}.${methodName}((params as any).caseInstanceId, (params as any).options);`;
      }
    }

    // Pattern 7: ProcessInstances methods with instanceId + folderKey
    if (tool.serviceName === 'ProcessInstancesService') {
      if (methodName === 'cancel' || methodName === 'pause' || methodName === 'resume') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId, (params as any).folderKey, (params as any).options);`;
      }
      if (methodName === 'getExecutionHistory') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId);`;
      }
      if (methodName === 'getBpmn' || methodName === 'getVariables' || methodName === 'getIncidents') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId, (params as any).folderKey);`;
      }
    }

    // Pattern 8: MaestroProcessesService.getIncidents
    if (tool.serviceName === 'MaestroProcessesService' && methodName === 'getIncidents') {
      return `const result = await ${clientPath}.${methodName}((params as any).processKey, (params as any).folderKey);`;
    }

    // Pattern 9: assign/reassign/unassign - takes array or single
    if (methodName === 'assign' || methodName === 'reassign') {
      return `const result = await ${clientPath}.${methodName}(params as any);`;
    }
    if (methodName === 'unassign') {
      return `const result = await ${clientPath}.${methodName}((params as any).taskIds);`;
    }

    // Pattern 10: Entity operations - insertById, updateById, deleteById
    if (methodName === 'insertById' || methodName === 'updateById') {
      return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).data);`;
    }
    if (methodName === 'deleteById') {
      return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).recordIds);`;
    }

    // Pattern 11: getRecordsById - (entityId, options?)
    if (methodName === 'getRecordsById') {
      return `const result = await ${clientPath}.${methodName}((params as any).entityId, (params as any).options);`;
    }

    // Pattern 12: getUsers - (folderId, options?)
    if (methodName === 'getUsers') {
      return `const { folderId, ...options } = params as any;
        const result = await ${clientPath}.${methodName}(folderId, options);`;
    }

    // Pattern 13: Bucket methods - pass params as options object
    if (methodName === 'uploadFile' || methodName === 'getReadUri') {
      return `const result = await ${clientPath}.${methodName}((params as any).options || params as any);`;
    }
    // getFileMetaData takes (bucketId, folderId, options?)
    if (methodName === 'getFileMetaData') {
      return `const result = await ${clientPath}.${methodName}((params as any).bucketId, (params as any).folderId, (params as any).options);`;
    }

    // Default: pass params object with any cast
    return `const result = await ${clientPath}.${methodName}(params as any);`;
  }

  /**
   * Get the client path for a tool
   *
   * The SDK uses flat paths for most services:
   * - client.processes (not client.orchestrator.processes)
   * - client.assets, client.queues, client.buckets
   * - client.tasks (not client.actionCenter.tasks)
   * - client.entities (not client.dataFabric.entities)
   * - client.maestro.processes (Maestro is nested)
   * - client.maestro.processes.instances
   * - client.maestro.processes.incidents
   * - client.maestro.cases
   * - client.maestro.cases.instances
   */
  private getClientPath(tool: GeneratedTool): string {
    // Direct mapping from service class name to client path
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

    const clientPath = serviceToClientPath[tool.serviceName];
    if (clientPath) {
      return clientPath;
    }

    // Fallback: extract service name and add 's' suffix
    let serviceName = tool.serviceName.replace(/Service$/, '');
    serviceName = serviceName.charAt(0).toLowerCase() + serviceName.slice(1);
    return `client.${serviceName}s`;
  }

  /**
   * Write generated tools to file
   */
  async writeToolsFile(tools: GeneratedTool[], outputPath: string): Promise<void> {
    const content = this.generateToolsFile(tools);
    const fullPath = path.resolve(outputPath, 'sdk-tools.ts');

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }
}

/**
 * Generate tools metadata JSON for debugging
 */
export function generateMetadataJson(tools: GeneratedTool[]): string {
  return JSON.stringify(tools, null, 2);
}
