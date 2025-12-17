/**
 * MCP Tool Generator
 *
 * Generates MCP tool registration code from parsed SDK service metadata.
 * Supports the unified GeneratorConfig format shared with CLI generator.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { ServiceInfo, ServiceMethod, ParsedSDK } from './service-parser.js';
import { methodToToolName } from './service-parser.js';
import { parametersToZodSchema, typeToZod } from './schema-converter.js';
import type {
  GeneratorConfig,
  MCPGeneratorConfig,
  LegacyMethodOverride,
  CompositeTool,
  ParameterDefinition,
} from './config.js';

export interface GeneratedTool {
  name: string;
  title: string;
  description: string;
  inputSchema: string;
  category: string;
  serviceName: string;
  methodName: string;
  isComposite?: boolean;
  isCustom?: boolean;
  compositeSteps?: CompositeTool['steps'];
}

/**
 * Generate MCP tools from parsed SDK using the unified GeneratorConfig
 */
export class ToolGenerator {
  private config: GeneratorConfig;
  private legacyConfig?: MCPGeneratorConfig;

  constructor(config: GeneratorConfig | MCPGeneratorConfig) {
    // Check if this is the legacy config format
    if ('naming' in config && 'methods' in config) {
      this.legacyConfig = config as MCPGeneratorConfig;
      this.config = this.convertLegacyToNew(config as MCPGeneratorConfig);
    } else {
      this.config = config as GeneratorConfig;
    }
  }

  /**
   * Convert legacy MCPGeneratorConfig to new GeneratorConfig
   */
  private convertLegacyToNew(legacy: MCPGeneratorConfig): GeneratorConfig {
    const config: GeneratorConfig = {
      sdkPath: legacy.sdkPath,
      output: { mcp: legacy.outputPath },
      services: {},
      overrides: {},
      skip: [...legacy.methods.exclude],
      settings: {
        includeByDefault: legacy.services.include.length === 0,
        generateMcp: true,
      },
    };

    // Convert service excludes
    for (const excluded of legacy.services.exclude) {
      config.services![excluded] = { skip: true };
    }

    // Convert method overrides
    for (const [key, override] of Object.entries(legacy.methods.overrides)) {
      config.overrides![key] = {
        mcp: {
          name: override.toolName,
          description: override.description,
          skip: override.skip,
        },
      };
    }

    return config;
  }

  /**
   * Generate all tools from parsed SDK metadata
   */
  generateTools(parsedSDK: ParsedSDK): GeneratedTool[] {
    const tools: GeneratedTool[] = [];

    // Generate SDK-based tools
    for (const service of parsedSDK.services) {
      if (!this.shouldIncludeService(service)) {
        continue;
      }

      for (const method of service.methods) {
        if (!this.shouldIncludeMethod(service, method)) {
          continue;
        }

        const tool = this.generateTool(service, method);
        if (tool) {
          tools.push(tool);
        }
      }
    }

    // Generate composite tools
    if (this.config.composites) {
      for (const composite of this.config.composites) {
        // Check if this composite should generate MCP tool
        if (composite.targets && !composite.targets.includes('mcp')) {
          continue;
        }

        const tool = this.generateCompositeTool(composite);
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
    const title = this.generateTitle(method.name, service.name);

    // Get description from override or method
    const description = override?.mcp?.description ||
      this.getLegacyDescription(toolName) ||
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
   * Generate a composite tool from config
   */
  private generateCompositeTool(composite: CompositeTool): GeneratedTool {
    const toolName = this.toSnakeCase(composite.name);

    // Generate Zod schema from parameter definitions
    const inputSchema = this.generateCompositeInputSchema(composite.parameters);

    return {
      name: toolName,
      title: this.generateTitle(composite.name, ''),
      description: composite.description,
      inputSchema,
      category: 'composite',
      serviceName: 'Composite',
      methodName: composite.name,
      isComposite: true,
      compositeSteps: composite.steps,
    };
  }

  /**
   * Generate Zod input schema for composite tool parameters
   */
  private generateCompositeInputSchema(parameters: Record<string, ParameterDefinition>): string {
    const props: string[] = [];

    for (const [name, param] of Object.entries(parameters)) {
      let zodType = this.parameterTypeToZod(param);

      if (param.description) {
        zodType += `.describe(${JSON.stringify(param.description)})`;
      }

      if (!param.required) {
        zodType += '.optional()';
      }

      props.push(`${name}: ${zodType}`);
    }

    return `z.object({\n      ${props.join(',\n      ')}\n    })`;
  }

  /**
   * Convert parameter type to Zod type
   */
  private parameterTypeToZod(param: ParameterDefinition): string {
    switch (param.type) {
      case 'string':
        return 'z.string()';
      case 'number':
        return 'z.number()';
      case 'boolean':
        return 'z.boolean()';
      case 'array':
        const itemType = param.items || 'string';
        return `z.array(z.${itemType}())`;
      case 'object':
        return 'z.record(z.unknown())';
      default:
        return 'z.unknown()';
    }
  }

  /**
   * Convert name to snake_case
   */
  private toSnakeCase(name: string): string {
    return name
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * Get tool name based on config
   */
  private getToolName(service: ServiceInfo, method: ServiceMethod): string {
    const override = this.getMethodOverride(service.name, method.name);
    if (override?.mcp?.name) {
      return override.mcp.name;
    }

    // Check legacy config override
    if (this.legacyConfig) {
      const legacyOverride = this.legacyConfig.methods.overrides[`${service.name}.${method.name}`];
      if (legacyOverride?.toolName) {
        return legacyOverride.toolName;
      }
    }

    const separator = this.legacyConfig?.naming.separator || '_';
    return methodToToolName(method.name, service.name, service.category, separator);
  }

  /**
   * Get legacy description from old config format
   */
  private getLegacyDescription(toolName: string): string | undefined {
    return this.legacyConfig?.descriptions[toolName];
  }

  /**
   * Generate human-readable title from method name
   */
  private generateTitle(methodName: string, serviceName: string): string {
    const words = methodName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

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
  private generateInputSchema(method: ServiceMethod, override?: { mcp?: { parameters?: Record<string, { required?: boolean; description?: string }> } }): string {
    const schema = parametersToZodSchema(method.parameters);

    // Apply overrides if present
    if (override?.mcp?.parameters) {
      for (const [paramName, paramOverride] of Object.entries(override.mcp.parameters)) {
        if (schema.properties[paramName]) {
          if (paramOverride.description) {
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
            if (paramOverride.required && schema.properties[paramName].isOptional) {
              schema.properties[paramName].zodType = schema.properties[paramName].zodType
                .replace('.optional()', '');
              schema.properties[paramName].isOptional = false;
            }
          }
        }
      }
    }

    // Apply legacy overrides
    if (this.legacyConfig) {
      const legacyOverride = this.legacyConfig.methods.overrides[`${method.name}`];
      if (legacyOverride?.inputSchema) {
        for (const [paramName, paramOverride] of Object.entries(legacyOverride.inputSchema)) {
          if (schema.properties[paramName]) {
            if (paramOverride.description) {
              const prop = schema.properties[paramName];
              prop.zodType = prop.zodType.replace(
                /\.describe\([^)]+\)/,
                `.describe(${JSON.stringify(paramOverride.description)})`
              );
              if (!prop.zodType.includes('.describe(')) {
                prop.zodType += `.describe(${JSON.stringify(paramOverride.description)})`;
              }
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
    // Check new config format
    const serviceConfig = this.config.services?.[service.name] || this.config.services?.[service.category];
    if (serviceConfig?.skip) {
      return false;
    }

    // Check legacy config format
    if (this.legacyConfig) {
      const { include, exclude } = this.legacyConfig.services;

      if (include.length > 0 && !include.includes(service.category)) {
        return false;
      }

      if (exclude.includes(service.category) || exclude.includes(service.name)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if method should be included based on config
   */
  private shouldIncludeMethod(service: ServiceInfo, method: ServiceMethod): boolean {
    const fullName = `${service.name}.${method.name}`;

    // Check new config skip list
    if (this.config.skip) {
      for (const pattern of this.config.skip) {
        if (this.matchesPattern(fullName, pattern)) {
          return false;
        }
      }
    }

    // Check new config override skip
    const override = this.getMethodOverride(service.name, method.name);
    if (override?.mcp?.skip) {
      return false;
    }

    // Check legacy config
    if (this.legacyConfig) {
      const { exclude, overrides } = this.legacyConfig.methods;

      if (overrides[fullName]?.skip) {
        return false;
      }

      for (const pattern of exclude) {
        if (this.matchesPattern(fullName, pattern)) {
          return false;
        }
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
  private getMethodOverride(serviceName: string, methodName: string) {
    return this.config.overrides?.[`${serviceName}.${methodName}`];
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
        if (tool.isComposite) {
          registrationCode += this.generateCompositeToolRegistration(tool);
        } else {
          registrationCode += this.generateToolRegistration(tool);
        }
      }
    }

    registrationCode += `}
`;

    return imports + registrationCode;
  }

  /**
   * Generate registration code for a composite tool
   */
  private generateCompositeToolRegistration(tool: GeneratedTool): string {
    if (!tool.compositeSteps) {
      return '';
    }

    // Generate the step execution code
    let stepsCode = '';
    for (const step of tool.compositeSteps) {
      const [serviceName, methodName] = step.call.split('.');
      const clientPath = this.getClientPathForService(serviceName);

      // Build args
      const args = step.args.map(arg => {
        if (typeof arg === 'string') {
          // Reference to param or previous output
          if (arg.includes('.')) {
            const [obj, ...rest] = arg.split('.');
            return `(${obj} as any).${rest.join('.')}`;
          }
          return `(params as any).${arg}`;
        }
        // Object literal - build the expression
        return JSON.stringify(arg).replace(/"(\w+)":/g, '$1:');
      }).join(', ');

      if (step.output) {
        stepsCode += `        const ${step.output} = await ${clientPath}.${methodName}(${args});\n`;
      } else {
        stepsCode += `        await ${clientPath}.${methodName}(${args});\n`;
      }
    }

    // Determine return value
    const returnValue = tool.compositeSteps.length > 0 && tool.compositeSteps[tool.compositeSteps.length - 1].output
      ? tool.compositeSteps[tool.compositeSteps.length - 1].output
      : '{ success: true }';

    return `
  // Composite Tool: ${tool.name}
  server.tool(
    '${tool.name}',
    ${JSON.stringify(tool.description)},
    ${tool.inputSchema},
    async (params) => {
      try {
${stepsCode}
        return {
          content: [{ type: 'text', text: JSON.stringify(${returnValue}, null, 2) }]
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
   * Get client path for a service name
   */
  private getClientPathForService(serviceName: string): string {
    const serviceToClientPath: Record<string, string> = {
      'Task': 'client.tasks',
      'TaskService': 'client.tasks',
      'Process': 'client.processes',
      'ProcessService': 'client.processes',
      'Asset': 'client.assets',
      'AssetService': 'client.assets',
      'Queue': 'client.queues',
      'QueueService': 'client.queues',
      'Bucket': 'client.buckets',
      'BucketService': 'client.buckets',
      'Entity': 'client.entities',
      'EntityService': 'client.entities',
      'MaestroProcesses': 'client.maestro.processes',
      'MaestroProcessesService': 'client.maestro.processes',
      'Cases': 'client.maestro.cases',
      'CasesService': 'client.maestro.cases',
    };

    return serviceToClientPath[serviceName] || `client.${serviceName.toLowerCase()}s`;
  }

  /**
   * Generate registration code for a single tool
   */
  private generateToolRegistration(tool: GeneratedTool): string {
    const clientPath = this.getClientPath(tool);
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
   */
  private generateMethodCall(tool: GeneratedTool, clientPath: string): string {
    const methodName = tool.methodName;

    // Pattern 1: getAll methods
    if (methodName === 'getAll') {
      if (tool.serviceName === 'CasesService' ||
          tool.serviceName === 'MaestroProcessesService' ||
          tool.serviceName === 'ProcessIncidentsService' ||
          tool.serviceName === 'EntityService') {
        return `const result = await ${clientPath}.${methodName}();`;
      }
      return `const result = await ${clientPath}.${methodName}(params as any);`;
    }

    // Pattern 2: getById methods
    if (methodName === 'getById') {
      if (tool.serviceName === 'EntityService') {
        return `const result = await ${clientPath}.${methodName}((params as any).id);`;
      }
      if (tool.serviceName === 'TaskService') {
        return `const result = await ${clientPath}.${methodName}((params as any).id, {}, (params as any).folderId);`;
      }
      if (tool.serviceName === 'CaseInstancesService') {
        return `const result = await ${clientPath}.${methodName}((params as any).instanceId, (params as any).folderKey);`;
      }
      if (tool.serviceName === 'ProcessInstancesService') {
        return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).folderKey);`;
      }
      return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).folderId);`;
    }

    // Pattern 3: start methods
    if (methodName === 'start') {
      return `const { folderId, ...request } = params as any;
        const result = await ${clientPath}.${methodName}(request, folderId);`;
    }

    // Pattern 4: create methods
    if (methodName === 'create') {
      return `const { folderId, ...data } = params as any;
        const result = await ${clientPath}.${methodName}(data, folderId);`;
    }

    // Pattern 5: complete methods
    if (methodName === 'complete') {
      return `const { folderId, ...options } = params as any;
        const result = await ${clientPath}.${methodName}(options, folderId);`;
    }

    // Pattern 6: CaseInstances methods
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

    // Pattern 7: ProcessInstances methods
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

    // Pattern 8: MaestroProcesses.getIncidents
    if (tool.serviceName === 'MaestroProcessesService' && methodName === 'getIncidents') {
      return `const result = await ${clientPath}.${methodName}((params as any).processKey, (params as any).folderKey);`;
    }

    // Pattern 9: assign/reassign/unassign
    if (methodName === 'assign' || methodName === 'reassign') {
      return `const result = await ${clientPath}.${methodName}(params as any);`;
    }
    if (methodName === 'unassign') {
      return `const result = await ${clientPath}.${methodName}((params as any).taskIds);`;
    }

    // Pattern 10: Entity operations
    if (methodName === 'insertById' || methodName === 'updateById') {
      return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).data);`;
    }
    if (methodName === 'deleteById') {
      return `const result = await ${clientPath}.${methodName}((params as any).id, (params as any).recordIds);`;
    }

    // Pattern 11: getRecordsById
    if (methodName === 'getRecordsById') {
      return `const result = await ${clientPath}.${methodName}((params as any).entityId, (params as any).options);`;
    }

    // Pattern 12: getUsers
    if (methodName === 'getUsers') {
      return `const { folderId, ...options } = params as any;
        const result = await ${clientPath}.${methodName}(folderId, options);`;
    }

    // Pattern 13: Bucket methods
    if (methodName === 'uploadFile' || methodName === 'getReadUri') {
      return `const result = await ${clientPath}.${methodName}((params as any).options || params as any);`;
    }
    if (methodName === 'getFileMetaData') {
      return `const result = await ${clientPath}.${methodName}((params as any).bucketId, (params as any).folderId, (params as any).options);`;
    }

    // Default
    return `const result = await ${clientPath}.${methodName}(params as any);`;
  }

  /**
   * Get the client path for a tool
   */
  private getClientPath(tool: GeneratedTool): string {
    const serviceToClientPath: Record<string, string> = {
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

    const clientPath = serviceToClientPath[tool.serviceName];
    if (clientPath) {
      return clientPath;
    }

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
