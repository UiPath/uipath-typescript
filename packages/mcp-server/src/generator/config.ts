/**
 * MCP Generator Configuration
 *
 * This file configures how SDK methods are converted to MCP tools.
 */

export interface MCPGeneratorConfig {
  /** Path to SDK source files (relative to this file) */
  sdkPath: string;

  /** Output path for generated tools */
  outputPath: string;

  /** Services to include/exclude */
  services: {
    /** Services to include (empty = all) */
    include: string[];
    /** Services to exclude */
    exclude: string[];
  };

  /** Methods to include/exclude and overrides */
  methods: {
    /** Methods to exclude from generation */
    exclude: string[];
    /** Override generated config for specific methods */
    overrides: Record<string, MethodOverride>;
  };

  /** Naming conventions */
  naming: {
    /** Prefix for all tool names */
    toolPrefix: string;
    /** Separator between category, service, method */
    separator: string;
    /** Naming style */
    style: 'snake_case' | 'camelCase';
  };

  /** Override descriptions for specific tools */
  descriptions: Record<string, string>;
}

export interface MethodOverride {
  /** Custom tool name */
  toolName?: string;
  /** Custom description */
  description?: string;
  /** Custom title */
  title?: string;
  /** Input schema overrides */
  inputSchema?: Record<string, { required?: boolean; description?: string }>;
  /** Skip this method */
  skip?: boolean;
}

const config: MCPGeneratorConfig = {
  // Path to SDK source (relative to generator directory at runtime)
  // From dist/generator/ -> ../../src/ (SDK source)
  sdkPath: '../../',  // Points to uipath-typescript root
  outputPath: '../src/tools/generated',

  services: {
    // Include all services by default
    include: [],
    // Exclude none by default
    exclude: []
  },

  methods: {
    // Exclude internal/private methods
    exclude: [
      // Internal methods starting with underscore
      '*._*',
      // Base class methods
      'BaseService.*',
      'FolderScopedService.*'
    ],

    // Override specific method configurations
    overrides: {
      'ProcessService.start': {
        description: 'Start an RPA process and create jobs in UiPath Orchestrator',
        inputSchema: {
          folderId: { required: true, description: 'Folder ID where the process is deployed' },
          releaseKey: { description: 'Release key (use this OR name, not both)' },
          name: { description: 'Process name (use this OR releaseKey, not both)' }
        }
      },
      'TaskService.complete': {
        description: 'Complete an Action Center task with the specified action and data'
      },
      'EntityService.getRecordsById': {
        description: 'Query records from a Data Service entity with optional filtering and pagination'
      }
    }
  },

  naming: {
    toolPrefix: '',
    separator: '_',
    style: 'snake_case'
  },

  descriptions: {
    // Global description overrides (tool name -> description)
    'orchestrator_processes_getAll': 'List all processes (releases) available in Orchestrator',
    'orchestrator_assets_getAll': 'List all assets in Orchestrator',
    'orchestrator_queues_addItem': 'Add a new item to an Orchestrator queue',
    'action_center_tasks_getAll': 'List all Action Center tasks',
    'data_fabric_entities_getAll': 'List all entities in Data Service'
  }
};

export default config;
