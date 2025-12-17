/**
 * Unified Generator Configuration
 *
 * This config system works for both CLI and MCP generation.
 * It supports:
 * - Overrides: Customize tool/command name, description, parameters
 * - Composites: Define tools that combine multiple SDK calls
 * - Custom: Add completely custom tools with their own handlers
 * - Skip: Exclude specific methods from generation
 *
 * By default, if no config is present, all SDK methods are included.
 */

/**
 * Parameter definition for composite and custom tools
 */
export interface ParameterDefinition {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
  items?: ParameterDefinition; // For array types
  properties?: Record<string, ParameterDefinition>; // For object types
}

/**
 * Override configuration for existing SDK methods
 */
export interface MethodOverride {
  /** Skip this method entirely */
  skip?: boolean;

  /** Override for MCP tool generation */
  mcp?: {
    name?: string;
    description?: string;
    /** Override parameter descriptions */
    parameters?: Record<string, { description?: string; required?: boolean }>;
  };

  /** Override for CLI command generation */
  cli?: {
    name?: string;
    description?: string;
    group?: string;
    /** Override flag descriptions */
    flags?: Record<string, { description?: string; required?: boolean; char?: string }>;
  };
}

/**
 * Step definition for composite tools
 */
export interface CompositeStep {
  /** SDK method to call: "ServiceName.methodName" */
  call: string;

  /**
   * Arguments to pass. Can be:
   * - Parameter name from composite input: "taskData"
   * - Nested path from previous step output: "step1.result.id"
   * - Literal value: { literal: "value" }
   */
  args: (string | { literal: unknown } | { from: string })[];

  /** Variable name to store the result for use in subsequent steps */
  output?: string;

  /** Optional condition to execute this step */
  condition?: string;
}

/**
 * Composite tool definition - combines multiple SDK calls
 */
export interface CompositeToolDefinition {
  /** Unique identifier for this tool */
  id: string;

  /** MCP tool name (snake_case) */
  mcpName: string;

  /** CLI command name (kebab-case) */
  cliName: string;

  /** CLI command group */
  cliGroup: string;

  /** Tool description */
  description: string;

  /** Input parameters */
  parameters: Record<string, ParameterDefinition>;

  /** Steps to execute in order */
  steps: CompositeStep[];

  /**
   * What to return from the composite.
   * Can reference any step output: "step2.result" or "finalStep"
   */
  returns: string;
}

/**
 * Custom tool definition - completely custom implementation
 */
export interface CustomToolDefinition {
  /** Unique identifier for this tool */
  id: string;

  /** MCP tool name (snake_case) */
  mcpName: string;

  /** CLI command name (kebab-case) */
  cliName: string;

  /** CLI command group */
  cliGroup: string;

  /** Tool description */
  description: string;

  /** Input parameters */
  parameters: Record<string, ParameterDefinition>;

  /**
   * Path to handler file (relative to config file).
   * Handler should export: async function execute(params: Record<string, unknown>, client: SDKClient): Promise<unknown>
   */
  handler: string;
}

/**
 * Service filter configuration
 */
export interface ServiceFilter {
  /** Only include these service categories. Empty = include all */
  include: string[];

  /** Exclude these service categories */
  exclude: string[];
}

/**
 * Complete generator configuration
 */
export interface GeneratorConfig {
  /** Configuration version for compatibility */
  version: '1.0';

  /** Service filtering */
  services: ServiceFilter;

  /**
   * Method overrides by "ServiceName.methodName"
   * Example: "TaskService.create"
   */
  overrides: Record<string, MethodOverride>;

  /**
   * Methods to skip entirely.
   * Supports glob patterns: "TaskService.*", "*.internal*"
   */
  skip: string[];

  /** Composite tools that combine multiple SDK calls */
  composites: CompositeToolDefinition[];

  /** Custom tools with their own handlers */
  custom: CustomToolDefinition[];

  /** Global settings */
  settings: {
    /** Include verbose JSDoc in generated code */
    includeJsDoc: boolean;

    /** Generate examples in tool descriptions */
    generateExamples: boolean;

    /** Default output format for CLI */
    defaultCliOutput: 'json' | 'table' | 'yaml';
  };
}

/**
 * Default configuration - includes everything
 */
export const DEFAULT_CONFIG: GeneratorConfig = {
  version: '1.0',
  services: {
    include: [], // Empty = include all
    exclude: []
  },
  overrides: {},
  skip: [],
  composites: [],
  custom: [],
  settings: {
    includeJsDoc: true,
    generateExamples: true,
    defaultCliOutput: 'table'
  }
};

/**
 * Example configuration with common customizations
 */
export const EXAMPLE_CONFIG: GeneratorConfig = {
  version: '1.0',

  services: {
    include: [], // Include all
    exclude: []
  },

  overrides: {
    'TaskService.create': {
      mcp: {
        name: 'create_action_center_task',
        description: 'Creates a new Action Center task for human-in-the-loop workflows'
      },
      cli: {
        name: 'create',
        description: 'Create a new Action Center task'
      }
    },
    'TaskService.getAll': {
      mcp: {
        description: 'Lists all Action Center tasks with optional filtering'
      }
    }
  },

  skip: [
    '*.internal*',  // Skip all internal methods
  ],

  composites: [
    {
      id: 'create-and-assign-task',
      mcpName: 'create_and_assign_task',
      cliName: 'create-and-assign',
      cliGroup: 'tasks',
      description: 'Creates a new task and immediately assigns it to a user',
      parameters: {
        task: {
          type: 'object',
          description: 'Task data to create',
          required: true
        },
        folderId: {
          type: 'number',
          description: 'Folder ID where the task will be created',
          required: true
        },
        userId: {
          type: 'string',
          description: 'User ID to assign the task to',
          required: true
        }
      },
      steps: [
        {
          call: 'TaskService.create',
          args: ['task', 'folderId'],
          output: 'createdTask'
        },
        {
          call: 'TaskService.assign',
          args: [
            { literal: { taskAssignments: [{ taskId: '${createdTask.id}', userId: '${userId}' }] } }
          ],
          output: 'assignment'
        }
      ],
      returns: 'createdTask'
    }
  ],

  custom: [
    {
      id: 'health-check',
      mcpName: 'api_health_check',
      cliName: 'health',
      cliGroup: 'system',
      description: 'Check UiPath API connectivity and authentication status',
      parameters: {
        verbose: {
          type: 'boolean',
          description: 'Include detailed timing information',
          required: false,
          default: false
        }
      },
      handler: './custom-handlers/health-check.ts'
    }
  ],

  settings: {
    includeJsDoc: true,
    generateExamples: true,
    defaultCliOutput: 'table'
  }
};
