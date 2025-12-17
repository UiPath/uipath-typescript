/**
 * Generator Configuration
 *
 * Customize CLI command and MCP tool generation from SDK services.
 * By default, all SDK methods are included if no config is present.
 *
 * For full documentation, see: docs/generator-config.md
 */

import { GeneratorConfig } from './src/generator/config.schema.js';

const config: GeneratorConfig = {
  // Output paths (optional - defaults will be used if not specified)
  output: {
    cli: 'commands',  // Output directly to src/commands/ (no "generated" prefix)
    mcp: 'src/tools/generated',
  },

  // Service-level configuration (optional)
  services: {
    // Example: skip entire service
    // 'InternalService': { skip: true },

    // Example: rename CLI group
    // 'TaskService': { cliGroup: 'action-tasks' },
  },

  // Method-level overrides (optional)
  overrides: {
    // Customize task creation description
    'TaskService.create': {
      cli: {
        description: 'Create a new Action Center task for human-in-the-loop workflows',
      },
      mcp: {
        name: 'create_action_center_task',
        description: 'Creates a new Action Center task for human-in-the-loop workflows',
      },
    },
    // Make asset listing more descriptive
    'AssetService.getAll': {
      cli: {
        name: 'list',
        description: 'List all Orchestrator assets with optional filtering',
      },
    },
  },

  // Methods to skip (supports glob patterns)
  skip: [
    // '*.internal*',  // Skip all internal methods
    // 'TaskService.deprecatedMethod',
  ],

  // Composite tools - combine multiple SDK calls into one tool
  composites: [
    // Create and assign task in one operation
    {
      name: 'createAndAssignTask',
      description: 'Creates a task and immediately assigns it to a user',
      cliGroup: 'tasks',
      parameters: {
        task: { type: 'object', required: true, description: 'Task data to create' },
        folderId: { type: 'number', required: true, description: 'Folder ID' },
        userId: { type: 'string', required: true, description: 'User ID to assign the task to' },
      },
      steps: [
        { call: 'Task.create', args: ['task', 'folderId'], output: 'createdTask' },
        { call: 'Task.assign', args: [{ taskAssignments: [{ taskId: 'createdTask.id', userId: 'userId' }] }] },
      ],
      returns: { value: 'createdTask' },
    },
  ],

  // Custom tools with their own handlers
  custom: [
    // Example: health check tool
    // {
    //   name: 'healthCheck',
    //   description: 'Check API connectivity',
    //   cliGroup: 'system',
    //   parameters: {
    //     verbose: { type: 'boolean', required: false, default: false },
    //   },
    //   handler: './custom-handlers/health-check.ts',
    // },
  ],

  // Global settings
  settings: {
    includeByDefault: true,  // Include all methods by default
    generateCli: true,       // Generate CLI commands
    generateMcp: true,       // Generate MCP tools
  },
};

export default config;
