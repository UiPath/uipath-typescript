/**
 * Generator Configuration Example
 *
 * This file shows all available configuration options for customizing
 * CLI command and MCP tool generation.
 *
 * To use: Copy this file to `generator.config.ts` and customize as needed.
 * If no config file is present, all SDK methods will be included by default.
 */

import { GeneratorConfig } from './src/generator/config.schema.js';

const config: GeneratorConfig = {
  /**
   * Global settings
   */
  settings: {
    // Include all SDK methods by default (set to false to require explicit inclusion)
    includeByDefault: true,
    // Generate CLI commands
    generateCli: true,
    // Generate MCP tools
    generateMcp: true,
  },

  /**
   * Service-level configuration
   * Configure entire services (skip, rename groups, etc.)
   */
  services: {
    // Example: Skip an entire service
    // 'InternalService': {
    //   skip: true,
    // },

    // Example: Customize service group name
    // 'TaskService': {
    //   cliGroup: 'action-center',
    //   mcpPrefix: 'ac_',
    //   description: 'Action Center task operations',
    // },
  },

  /**
   * Method-level overrides
   * Customize individual SDK methods
   * Key format: 'ServiceName.methodName'
   */
  overrides: {
    // Example: Customize a method's CLI and MCP output
    // 'TaskService.create': {
    //   cli: {
    //     name: 'new',                    // Custom command name (uipath tasks new)
    //     description: 'Create a new Action Center task',
    //     group: 'tasks',                 // Override group
    //     parameters: {
    //       task: {
    //         name: 'data',               // Rename flag
    //         description: 'Task data as JSON',
    //         char: 'd',                  // Short flag (-d)
    //       },
    //       folderId: {
    //         description: 'Target folder ID',
    //         char: 'f',
    //       },
    //     },
    //   },
    //   mcp: {
    //     name: 'create_action_task',     // Custom tool name
    //     description: 'Creates a new Action Center task for human review',
    //   },
    // },

    // Example: Skip a method for CLI but keep for MCP
    // 'TaskService.internalMethod': {
    //   cli: { skip: true },
    // },
  },

  /**
   * Methods to skip from generation
   * Supports wildcards: 'ServiceName.*' skips all methods
   */
  skip: [
    // 'InternalService.*',           // Skip all methods from a service
    // 'TaskService.debugMethod',     // Skip specific method
  ],

  /**
   * Composite tools - combine multiple SDK calls into one tool/command
   * Great for common workflows that involve multiple steps
   */
  composites: [
    // Example: Create and assign task in one operation
    // {
    //   name: 'create_and_assign_task',
    //   description: 'Creates a new task and assigns it to a user in one operation',
    //   cliGroup: 'tasks',           // CLI: uipath tasks create-and-assign-task
    //   parameters: {
    //     task: {
    //       type: 'object',
    //       required: true,
    //       description: 'Task data to create',
    //     },
    //     folderId: {
    //       type: 'number',
    //       required: true,
    //       description: 'Folder ID for the task',
    //     },
    //     userId: {
    //       type: 'string',
    //       required: true,
    //       description: 'User ID to assign the task to',
    //     },
    //   },
    //   steps: [
    //     {
    //       call: 'TaskService.create',
    //       args: ['task', 'folderId'],
    //       output: 'createdTask',
    //     },
    //     {
    //       call: 'TaskService.assign',
    //       args: [{ taskIds: ['createdTask.id'], userId: 'userId' }],
    //       output: 'assignResult',
    //     },
    //   ],
    //   returns: {
    //     value: 'createdTask',
    //     description: 'The created and assigned task',
    //   },
    //   targets: ['cli', 'mcp'],     // Generate for both CLI and MCP
    // },

    // Example: Batch process multiple queue items
    // {
    //   name: 'process_queue_batch',
    //   description: 'Process multiple queue items and mark them complete',
    //   cliGroup: 'queues',
    //   parameters: {
    //     queueId: {
    //       type: 'string',
    //       required: true,
    //       description: 'Queue ID to process',
    //     },
    //     count: {
    //       type: 'number',
    //       required: false,
    //       default: 10,
    //       description: 'Number of items to process',
    //     },
    //   },
    //   steps: [
    //     {
    //       call: 'QueueService.getItems',
    //       args: ['queueId', { top: 'count' }],
    //       output: 'items',
    //     },
    //     // Additional processing steps...
    //   ],
    //   targets: ['cli'],
    // },
  ],

  /**
   * Custom tools - completely custom implementations
   * Use when you need logic that can't be expressed as SDK calls
   */
  custom: [
    // Example: Health check tool
    // {
    //   name: 'health_check',
    //   description: 'Check connectivity to all UiPath services',
    //   cliGroup: 'system',
    //   parameters: {
    //     verbose: {
    //       type: 'boolean',
    //       required: false,
    //       default: false,
    //       description: 'Show detailed status for each service',
    //     },
    //   },
    //   handler: 'health-check.ts',   // Path relative to src/custom/
    //   targets: ['cli', 'mcp'],
    // },

    // Example: Interactive workflow wizard
    // {
    //   name: 'workflow_wizard',
    //   description: 'Interactive wizard to create a complete workflow',
    //   cliGroup: 'wizards',
    //   parameters: {
    //     template: {
    //       type: 'string',
    //       required: false,
    //       description: 'Template name to use',
    //     },
    //   },
    //   handler: 'workflow-wizard.ts',
    //   targets: ['cli'],             // CLI only (interactive)
    // },
  ],
};

export default config;
