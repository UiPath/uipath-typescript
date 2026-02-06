/**
 * AST Parser for SDK Service Discovery
 *
 * Parses SDK source files to extract service methods, parameters, and types
 * using TypeScript AST via ts-morph.
 *
 * Shared logic with mcp-server/src/generator/service-parser.ts
 */

import { Project, SourceFile, ClassDeclaration, MethodDeclaration, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';

export interface MethodParameter {
  name: string;
  type: string;
  isOptional: boolean;
  description?: string;
  defaultValue?: string;
}

export interface ServiceMethod {
  name: string;
  description: string;
  parameters: MethodParameter[];
  returnType: string;
  isAsync: boolean;
  decorators: string[];
  category: string;
  serviceName: string;
}

export interface ServiceInfo {
  name: string;
  category: string;
  description: string;
  filePath: string;
  methods: ServiceMethod[];
  baseClass?: string;
}

export interface ParsedSDK {
  services: ServiceInfo[];
  types: Map<string, TypeInfo>;
}

export interface TypeInfo {
  name: string;
  kind: 'interface' | 'type' | 'enum';
  properties?: PropertyInfo[];
  enumValues?: string[];
  filePath: string;
}

export interface PropertyInfo {
  name: string;
  type: string;
  isOptional: boolean;
  description?: string;
}

/**
 * Parse SDK source files and extract service metadata
 */
export class ServiceParser {
  private project: Project;
  private sdkPath: string;

  constructor(sdkPath: string) {
    this.sdkPath = path.resolve(sdkPath);
    this.project = new Project({
      tsConfigFilePath: path.join(this.sdkPath, 'tsconfig.json'),
      skipAddingFilesFromTsConfig: true
    });
  }

  /**
   * Parse all services from the SDK
   */
  async parseServices(): Promise<ParsedSDK> {
    const services: ServiceInfo[] = [];
    const types = new Map<string, TypeInfo>();

    // Add service files
    const servicePatterns = [
      path.join(this.sdkPath, 'src/services/**/*.ts'),
      path.join(this.sdkPath, 'src/models/**/*.ts')
    ];

    for (const pattern of servicePatterns) {
      this.project.addSourceFilesAtPaths(pattern);
    }

    // Parse service files
    const serviceFiles = this.project.getSourceFiles().filter(f =>
      f.getFilePath().includes('/services/') &&
      !f.getFilePath().includes('.test.') &&
      !f.getFilePath().includes('.spec.') &&
      !f.getFilePath().includes('index.ts')
    );

    for (const sourceFile of serviceFiles) {
      const serviceInfo = this.parseServiceFile(sourceFile);
      if (serviceInfo) {
        services.push(serviceInfo);
      }
    }

    // Parse model files for types
    const modelFiles = this.project.getSourceFiles().filter(f =>
      f.getFilePath().includes('/models/')
    );

    for (const sourceFile of modelFiles) {
      const fileTypes = this.parseTypesFromFile(sourceFile);
      for (const [name, info] of fileTypes) {
        types.set(name, info);
      }
    }

    return { services, types };
  }

  /**
   * Parse a single service file
   */
  private parseServiceFile(sourceFile: SourceFile): ServiceInfo | null {
    const classes = sourceFile.getClasses();
    const serviceClass = classes.find(c =>
      c.getName()?.endsWith('Service') &&
      !c.getName()?.startsWith('Base') &&
      !c.getName()?.startsWith('FolderScoped')
    );

    if (!serviceClass) {
      return null;
    }

    const className = serviceClass.getName()!;
    const filePath = sourceFile.getFilePath();
    const category = this.getCategoryFromPath(filePath);
    const baseClass = serviceClass.getExtends()?.getText();

    // Get JSDoc description
    const description = this.getJsDocDescription(serviceClass) ||
      `Service for ${className.replace('Service', '')} operations`;

    const methods = this.parseServiceMethods(serviceClass, category, className);

    return {
      name: className,
      category,
      description,
      filePath,
      methods,
      baseClass
    };
  }

  /**
   * Parse methods from a service class
   */
  private parseServiceMethods(
    classDecl: ClassDeclaration,
    category: string,
    serviceName: string
  ): ServiceMethod[] {
    const methods: ServiceMethod[] = [];

    for (const method of classDecl.getMethods()) {
      // Skip private and protected methods
      if (method.hasModifier(SyntaxKind.PrivateKeyword) ||
          method.hasModifier(SyntaxKind.ProtectedKeyword)) {
        continue;
      }

      // Skip methods starting with underscore
      const methodName = method.getName();
      if (methodName.startsWith('_')) {
        continue;
      }

      const methodInfo = this.parseMethod(method, category, serviceName);
      if (methodInfo) {
        methods.push(methodInfo);
      }
    }

    return methods;
  }

  /**
   * Parse a single method
   */
  private parseMethod(
    method: MethodDeclaration,
    category: string,
    serviceName: string
  ): ServiceMethod | null {
    const name = method.getName();
    const description = this.getJsDocDescription(method) || `${name} operation`;
    const isAsync = method.isAsync() || method.getReturnType().getText().includes('Promise');

    // Get decorators
    const decorators = method.getDecorators().map(d => d.getName());

    // Parse parameters
    const parameters: MethodParameter[] = [];
    for (const param of method.getParameters()) {
      const paramName = param.getName();
      const paramType = param.getType().getText();
      const isOptional = param.isOptional() || param.hasInitializer();
      const defaultValue = param.getInitializer()?.getText();

      // Get parameter description from JSDoc
      const paramDescription = this.getJsDocParamDescription(method, paramName);

      parameters.push({
        name: paramName,
        type: this.simplifyType(paramType),
        isOptional,
        description: paramDescription,
        defaultValue
      });
    }

    // Get return type
    const returnType = this.simplifyType(method.getReturnType().getText());

    return {
      name,
      description,
      parameters,
      returnType,
      isAsync,
      decorators,
      category,
      serviceName
    };
  }

  /**
   * Parse types from a model file
   */
  private parseTypesFromFile(sourceFile: SourceFile): Map<string, TypeInfo> {
    const types = new Map<string, TypeInfo>();
    const filePath = sourceFile.getFilePath();

    // Parse interfaces
    for (const iface of sourceFile.getInterfaces()) {
      const name = iface.getName();
      const properties: PropertyInfo[] = [];

      for (const prop of iface.getProperties()) {
        properties.push({
          name: prop.getName(),
          type: this.simplifyType(prop.getType().getText()),
          isOptional: prop.hasQuestionToken(),
          description: this.getJsDocDescription(prop)
        });
      }

      types.set(name, {
        name,
        kind: 'interface',
        properties,
        filePath
      });
    }

    // Parse type aliases
    for (const typeAlias of sourceFile.getTypeAliases()) {
      const name = typeAlias.getName();
      types.set(name, {
        name,
        kind: 'type',
        filePath
      });
    }

    // Parse enums
    for (const enumDecl of sourceFile.getEnums()) {
      const name = enumDecl.getName();
      const enumValues = enumDecl.getMembers().map(m => m.getName());

      types.set(name, {
        name,
        kind: 'enum',
        enumValues,
        filePath
      });
    }

    return types;
  }

  /**
   * Get category from file path
   */
  private getCategoryFromPath(filePath: string): string {
    if (filePath.includes('/orchestrator/')) return 'orchestrator';
    if (filePath.includes('/action-center/')) return 'action_center';
    if (filePath.includes('/data-fabric/')) return 'data_fabric';
    if (filePath.includes('/maestro/')) return 'maestro';
    if (filePath.includes('/identity/')) return 'identity';
    return 'other';
  }

  /**
   * Get JSDoc description from a node
   */
  private getJsDocDescription(node: Node): string | undefined {
    const jsDocs = (node as any).getJsDocs?.();
    if (!jsDocs || jsDocs.length === 0) return undefined;

    const description = jsDocs[0].getDescription?.();
    return description?.trim();
  }

  /**
   * Get JSDoc parameter description
   */
  private getJsDocParamDescription(method: MethodDeclaration, paramName: string): string | undefined {
    const jsDocs = method.getJsDocs();
    if (jsDocs.length === 0) return undefined;

    for (const jsDoc of jsDocs) {
      const tags = jsDoc.getTags();
      for (const tag of tags) {
        if (tag.getTagName() === 'param') {
          const text = tag.getText();
          if (text.includes(paramName)) {
            // Extract description after parameter name
            const match = text.match(new RegExp(`@param\\s+\\{?[^}]*\\}?\\s*${paramName}\\s*[-–]?\\s*(.+)`, 's'));
            if (match) return match[1].trim();
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Simplify complex TypeScript types for display
   */
  private simplifyType(type: string): string {
    // Remove import statements
    type = type.replace(/import\([^)]+\)\./g, '');

    // Simplify Promise types
    type = type.replace(/Promise<([^>]+)>/g, '$1');

    // Simplify common patterns
    type = type.replace(/Paginated<([^>]+)>/g, 'Paginated<$1>');

    return type;
  }
}

/**
 * Helper to convert service name to command group
 */
export function serviceNameToCommandGroup(serviceName: string): string {
  // Remove 'Service' suffix
  let name = serviceName.replace(/Service$/, '');

  // Handle special cases
  if (name === 'Process') return 'processes';
  if (name === 'Asset') return 'assets';
  if (name === 'Queue') return 'queues';
  if (name === 'Bucket') return 'buckets';
  if (name === 'Task') return 'tasks';
  if (name === 'Entity') return 'entities';
  if (name === 'MaestroProcesses') return 'maestro processes';
  if (name === 'ProcessInstances') return 'maestro instances';
  if (name === 'ProcessIncidents') return 'maestro incidents';
  if (name === 'Cases') return 'maestro cases';
  if (name === 'CaseInstances') return 'maestro case-instances';

  // Convert to kebab-case
  return name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

/**
 * Convert method name to command name
 */
export function methodToCommandName(methodName: string): string {
  // Map common method names to CLI-friendly names
  const methodMap: Record<string, string> = {
    'getAll': 'list',
    'getById': 'get',
    'create': 'create',
    'update': 'update',
    'delete': 'delete',
    'start': 'start',
    'complete': 'complete',
    'assign': 'assign',
    'reassign': 'reassign',
    'unassign': 'unassign',
    'pause': 'pause',
    'resume': 'resume',
    'cancel': 'cancel',
    'close': 'close',
    'insertById': 'insert',
    'updateById': 'update-records',
    'deleteById': 'delete-records',
    'getRecordsById': 'query',
    'getUsers': 'get-users',
    'uploadFile': 'upload',
    'getReadUri': 'get-read-uri',
    'getFileMetaData': 'get-file-metadata',
    'getExecutionHistory': 'execution-history',
    'getStages': 'stages',
    'getActionTasks': 'action-tasks',
    'getBpmn': 'bpmn',
    'getVariables': 'variables',
    'getIncidents': 'incidents'
  };

  if (methodMap[methodName]) {
    return methodMap[methodName];
  }

  // Convert camelCase to kebab-case
  return methodName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}
