/**
 * MCP Generator Configuration
 *
 * This file configures how SDK methods are converted to MCP tools.
 */
const config = {
    sdkPath: '../../src',
    outputPath: './src/tools/generated',
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
//# sourceMappingURL=mcp-generator.config.js.map