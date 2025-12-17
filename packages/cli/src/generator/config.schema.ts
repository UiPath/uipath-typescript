/**
 * Generator Configuration Schema
 *
 * This file defines the configuration schema for customizing CLI command
 * and MCP tool generation from SDK services.
 */

/**
 * Parameter definition for composite/custom tools
 */
export interface ParameterDefinition {
  /** Parameter type */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  /** Whether the parameter is required */
  required?: boolean;
  /** Parameter description */
  description?: string;
  /** Default value */
  default?: unknown;
  /** For array types, the type of array items */
  items?: 'string' | 'number' | 'boolean' | 'object';
}

/**
 * Override configuration for existing SDK methods
 */
export interface MethodOverride {
  /** Override for MCP tool generation */
  mcp?: {
    /** Custom tool name (snake_case) */
    name?: string;
    /** Custom description */
    description?: string;
    /** Parameter overrides */
    parameters?: Record<string, Partial<ParameterDefinition>>;
    /** Skip this method in MCP generation */
    skip?: boolean;
  };
  /** Override for CLI command generation */
  cli?: {
    /** Custom command name (kebab-case) */
    name?: string;
    /** Custom description */
    description?: string;
    /** Custom command group */
    group?: string;
    /** Parameter/flag overrides */
    parameters?: Record<string, {
      /** Flag name override */
      name?: string;
      /** Flag description */
      description?: string;
      /** Short flag character */
      char?: string;
      /** Whether required */
      required?: boolean;
    }>;
    /** Skip this method in CLI generation */
    skip?: boolean;
  };
}

/**
 * Step in a composite tool that calls an SDK method
 */
export interface CompositeStep {
  /** SDK method to call (e.g., 'TaskService.create') */
  call: string;
  /**
   * Arguments to pass to the method.
   * Can reference input parameters by name or previous step outputs.
   * Use dot notation for nested access (e.g., 'createdTask.id')
   */
  args: (string | Record<string, unknown>)[];
  /** Variable name to store the result for use in subsequent steps */
  output?: string;
  /** Optional condition to execute this step */
  condition?: string;
}

/**
 * Composite tool definition - combines multiple SDK calls
 */
export interface CompositeTool {
  /** Tool/command name */
  name: string;
  /** Description of what this composite tool does */
  description: string;
  /** Input parameters for the composite tool */
  parameters: Record<string, ParameterDefinition>;
  /** Sequence of SDK calls to execute */
  steps: CompositeStep[];
  /** Which outputs to generate */
  targets?: ('mcp' | 'cli')[];
  /** For CLI: which group to place the command in */
  cliGroup?: string;
  /** What to return from the composite tool */
  returns?: {
    /** Variable name or expression to return */
    value: string;
    /** Description of the return value */
    description?: string;
  };
}

/**
 * Custom tool definition - completely custom implementation
 */
export interface CustomTool {
  /** Tool/command name */
  name: string;
  /** Description */
  description: string;
  /** Input parameters */
  parameters: Record<string, ParameterDefinition>;
  /** Path to the handler file (relative to config) */
  handler: string;
  /** Which outputs to generate */
  targets?: ('mcp' | 'cli')[];
  /** For CLI: which group to place the command in */
  cliGroup?: string;
}

/**
 * Service-level configuration
 */
export interface ServiceConfig {
  /** Skip entire service */
  skip?: boolean;
  /** Override service description */
  description?: string;
  /** For CLI: override command group name */
  cliGroup?: string;
  /** For MCP: override tool name prefix */
  mcpPrefix?: string;
}

/**
 * Main generator configuration
 */
export interface GeneratorConfig {
  /**
   * Path to SDK source files
   * @default Detected from workspace
   */
  sdkPath?: string;

  /**
   * Output configuration
   */
  output?: {
    /** CLI commands output path */
    cli?: string;
    /** MCP tools output path */
    mcp?: string;
  };

  /**
   * Service-level configuration
   */
  services?: Record<string, ServiceConfig>;

  /**
   * Method-level overrides
   * Key format: 'ServiceName.methodName'
   */
  overrides?: Record<string, MethodOverride>;

  /**
   * Methods to skip from generation
   * Format: 'ServiceName.methodName' or 'ServiceName.*' for all methods
   */
  skip?: string[];

  /**
   * Composite tools - combine multiple SDK calls into one tool/command
   */
  composites?: CompositeTool[];

  /**
   * Custom tools - completely custom implementations
   */
  custom?: CustomTool[];

  /**
   * Global settings
   */
  settings?: {
    /** Include all methods by default (true) or require explicit inclusion (false) */
    includeByDefault?: boolean;
    /** Generate CLI commands */
    generateCli?: boolean;
    /** Generate MCP tools */
    generateMcp?: boolean;
    /** Default output format for CLI commands */
    defaultCliOutput?: 'json' | 'table' | 'yaml';
  };
}

/**
 * Default configuration - includes everything
 */
export const defaultConfig: GeneratorConfig = {
  settings: {
    includeByDefault: true,
    generateCli: true,
    generateMcp: true,
  },
  services: {},
  overrides: {},
  skip: [],
  composites: [],
  custom: [],
};

/**
 * Load and merge configuration with defaults
 */
export function mergeWithDefaults(config: Partial<GeneratorConfig>): GeneratorConfig {
  return {
    ...defaultConfig,
    ...config,
    settings: {
      ...defaultConfig.settings,
      ...config.settings,
    },
    services: {
      ...defaultConfig.services,
      ...config.services,
    },
    overrides: {
      ...defaultConfig.overrides,
      ...config.overrides,
    },
    skip: [...(defaultConfig.skip || []), ...(config.skip || [])],
    composites: [...(defaultConfig.composites || []), ...(config.composites || [])],
    custom: [...(defaultConfig.custom || []), ...(config.custom || [])],
  };
}
