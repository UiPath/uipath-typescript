/**
 * CLI Generator Configuration
 *
 * This file configures how SDK methods are converted to CLI commands.
 */

export interface CLIGeneratorConfig {
  /** Path to SDK source files (relative to this file) */
  sdkPath: string;

  /** Output path for generated commands */
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
    /** Style for command names */
    style: 'kebab-case' | 'snake_case';
  };

  /** Override descriptions for specific commands */
  descriptions: Record<string, string>;
}

export interface MethodOverride {
  /** Custom command name */
  commandName?: string;
  /** Custom description */
  description?: string;
  /** Custom examples */
  examples?: string[];
  /** Flag overrides */
  flags?: Record<string, { description?: string; required?: boolean; char?: string }>;
  /** Skip this method */
  skip?: boolean;
}

const config: CLIGeneratorConfig = {
  // Path to SDK source (relative to generator directory at runtime)
  // From dist/generator/ -> ../../../../ (SDK root)
  sdkPath: '../../../../',
  outputPath: '../src/commands/generated',

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
        examples: [
          'uipath processes start --name "InvoiceProcessor" --folder-id 123',
          'uipath processes start --release-key abc-123 --folder-id 123 --input \'{"amount": 1500}\''
        ],
        flags: {
          folderId: { required: true, description: 'Folder ID where the process is deployed', char: 'f' },
          releaseKey: { description: 'Release key (use this OR name, not both)' },
          name: { description: 'Process name (use this OR releaseKey, not both)', char: 'n' }
        }
      },
      'TaskService.complete': {
        description: 'Complete an Action Center task with the specified action and data',
        examples: [
          'uipath tasks complete --id task-123 --action approve --folder-id 456'
        ]
      },
      'EntityService.getRecordsById': {
        description: 'Query records from a Data Service entity with optional filtering and pagination',
        examples: [
          'uipath entities query --entity-id abc-123 --filter "Status eq \'Active\'"'
        ]
      }
    }
  },

  naming: {
    style: 'kebab-case'
  },

  descriptions: {
    // Global description overrides (command name -> description)
    'processes list': 'List all processes (releases) available in Orchestrator',
    'assets list': 'List all assets in Orchestrator',
    'queues add-item': 'Add a new item to an Orchestrator queue',
    'tasks list': 'List all Action Center tasks',
    'entities list': 'List all entities in Data Service'
  }
};

export default config;
