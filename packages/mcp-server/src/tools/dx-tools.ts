/**
 * Developer Experience Tools
 *
 * These are manually implemented tools that enhance the developer experience
 * when working with UiPath SDK via MCP.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { UiPathClient, UiPathConfig } from '../server/index.js';

/**
 * Service catalog for documentation
 */
const SERVICE_CATALOG = {
  orchestrator: {
    name: 'Orchestrator',
    description: 'Manage RPA processes, assets, queues, and storage buckets',
    services: {
      processes: {
        description: 'Manage and execute RPA processes',
        methods: [
          { name: 'getAll', description: 'List all processes', params: ['folderId?', 'filter?', 'top?', 'skip?'] },
          { name: 'getById', description: 'Get process by ID', params: ['id', 'folderId'] },
          { name: 'start', description: 'Start a process', params: ['releaseKey?', 'name?', 'inputArguments?', 'folderId'] }
        ]
      },
      assets: {
        description: 'Manage Orchestrator assets',
        methods: [
          { name: 'getAll', description: 'List all assets', params: ['folderId?', 'filter?'] },
          { name: 'getById', description: 'Get asset by ID', params: ['id', 'folderId'] },
          { name: 'create', description: 'Create a new asset', params: ['name', 'valueType', 'value', 'folderId'] }
        ]
      },
      queues: {
        description: 'Manage Orchestrator queues',
        methods: [
          { name: 'getAll', description: 'List all queues', params: ['folderId?', 'filter?'] },
          { name: 'addItem', description: 'Add item to queue', params: ['queueName', 'specificContent', 'folderId'] }
        ]
      },
      buckets: {
        description: 'Manage storage buckets',
        methods: [
          { name: 'getAll', description: 'List all buckets', params: ['folderId?', 'filter?'] }
        ]
      }
    }
  },
  actionCenter: {
    name: 'Action Center',
    description: 'Human-in-the-loop task management',
    services: {
      tasks: {
        description: 'Manage Action Center tasks',
        methods: [
          { name: 'getAll', description: 'List all tasks', params: ['folderId?', 'filter?'] },
          { name: 'getById', description: 'Get task by ID', params: ['id', 'folderId?'] },
          { name: 'complete', description: 'Complete a task', params: ['taskId', 'action', 'data?', 'folderId'] }
        ]
      }
    }
  },
  dataFabric: {
    name: 'Data Fabric',
    description: 'Data Service entity management',
    services: {
      entities: {
        description: 'Manage Data Service entities',
        methods: [
          { name: 'getAll', description: 'List all entities', params: [] },
          { name: 'getById', description: 'Get entity by ID', params: ['id'] },
          { name: 'getRecordsById', description: 'Query entity records', params: ['entityId', 'filter?', 'top?', 'skip?'] }
        ]
      }
    }
  },
  maestro: {
    name: 'Maestro',
    description: 'Process orchestration and monitoring',
    services: {
      processes: {
        description: 'Manage Maestro processes',
        methods: [
          { name: 'getAll', description: 'List all processes', params: [] },
          { name: 'start', description: 'Start a process', params: ['processId', 'inputArguments?'] }
        ]
      }
    }
  }
};

/**
 * Code templates for different operations
 */
const CODE_TEMPLATES: Record<string, { code: string; imports: string[]; explanation: string }> = {
  'start process': {
    imports: ["import { UiPath } from '@uipath/sdk';"],
    explanation: 'This code initializes the UiPath SDK client and starts a process by name or release key.',
    code: `// Initialize UiPath SDK client
const uipath = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  auth: {
    type: 'pat',
    token: process.env.UIPATH_PAT_TOKEN
  }
});

// Start a process
const folderId = 12345; // Your folder ID
const jobs = await uipath.orchestrator.processes.start(
  {
    name: 'MyProcess', // Or use releaseKey instead
    inputArguments: {
      // Your process input arguments
      arg1: 'value1',
      arg2: 123
    }
  },
  folderId
);

console.log('Started jobs:', jobs);`
  },
  'create queue item': {
    imports: ["import { UiPath } from '@uipath/sdk';"],
    explanation: 'This code adds a new item to an Orchestrator queue with custom data.',
    code: `// Initialize UiPath SDK client
const uipath = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  auth: {
    type: 'pat',
    token: process.env.UIPATH_PAT_TOKEN
  }
});

// Add item to queue
const folderId = 12345; // Your folder ID
const queueItem = await uipath.orchestrator.queues.addItem(
  {
    queueName: 'MyQueue',
    specificContent: {
      // Your queue item data
      customerId: '12345',
      orderAmount: 99.99,
      processDate: new Date().toISOString()
    },
    priority: 'Normal',
    reference: 'ORDER-12345'
  },
  folderId
);

console.log('Created queue item:', queueItem);`
  },
  'complete task': {
    imports: ["import { UiPath } from '@uipath/sdk';"],
    explanation: 'This code completes an Action Center task with an action and optional data.',
    code: `// Initialize UiPath SDK client
const uipath = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  auth: {
    type: 'pat',
    token: process.env.UIPATH_PAT_TOKEN
  }
});

// Complete an Action Center task
const folderId = 12345; // Your folder ID
const result = await uipath.actionCenter.tasks.complete(
  {
    taskId: 67890,
    action: 'Approve', // or 'Reject', etc.
    data: {
      // Optional completion data
      approverComments: 'Approved after review',
      approvedAmount: 1500.00
    }
  },
  folderId
);

console.log('Task completed:', result);`
  },
  'query data service': {
    imports: ["import { UiPath } from '@uipath/sdk';"],
    explanation: 'This code queries records from a Data Service entity with filtering.',
    code: `// Initialize UiPath SDK client
const uipath = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  auth: {
    type: 'pat',
    token: process.env.UIPATH_PAT_TOKEN
  }
});

// Query records from Data Service entity
const records = await uipath.dataFabric.entities.getRecordsById(
  'my-entity-id',
  {
    filter: "status eq 'Active'",
    orderby: 'createdAt desc',
    top: 100,
    skip: 0
  }
);

console.log('Records:', records.items);`
  },
  'list processes': {
    imports: ["import { UiPath } from '@uipath/sdk';"],
    explanation: 'This code lists all available processes in a folder.',
    code: `// Initialize UiPath SDK client
const uipath = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  auth: {
    type: 'pat',
    token: process.env.UIPATH_PAT_TOKEN
  }
});

// List all processes
const folderId = 12345; // Your folder ID
const processes = await uipath.orchestrator.processes.getAll({
  folderId,
  top: 50,
  orderby: 'Name asc'
});

console.log('Processes:', processes.items);
console.log('Total count:', processes.totalCount);`
  }
};

/**
 * Register Developer Experience tools
 */
export function registerDXTools(
  server: McpServer,
  client: UiPathClient,
  config: UiPathConfig
): void {
  // ============================================
  // Tool 1: Validate Connection
  // ============================================

  server.tool(
    'uipath_validate_connection',
    'Verify that the UiPath SDK is properly configured and can connect to UiPath Cloud',
    {},
    async () => {
      try {
        // Try to make a simple API call to validate connection
        await client.processes.getAll({ pageSize: 1 });

        return {
          content: [{
            type: 'text',
            text: `✅ Connected to UiPath successfully!

Organization: ${config.orgName}
Tenant: ${config.tenantName}
Base URL: ${config.baseUrl}
Folder ID: ${config.folderId || 'Not set (will use default)'}

The connection is working and you can use all UiPath tools.`
          }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{
            type: 'text',
            text: `❌ Connection failed!

Organization: ${config.orgName}
Tenant: ${config.tenantName}
Base URL: ${config.baseUrl}

Error: ${message}

Please check:
1. UIPATH_BASE_URL is correct (e.g., https://cloud.uipath.com)
2. UIPATH_ORG_NAME matches your organization
3. UIPATH_TENANT_NAME matches your tenant
4. UIPATH_PAT_TOKEN is valid and not expired`
          }],
          isError: true
        };
      }
    }
  );

  // ============================================
  // Tool 2: List Services
  // ============================================

  server.tool(
    'uipath_list_services',
    'List all available UiPath SDK services and their methods',
    {
      category: z.enum(['orchestrator', 'actionCenter', 'dataFabric', 'maestro', 'all'])
        .optional()
        .default('all')
        .describe('Filter by service category'),
      showExamples: z.boolean()
        .optional()
        .default(false)
        .describe('Show example parameters for each method')
    },
    async ({ category, showExamples }) => {
      const categories = category === 'all'
        ? Object.keys(SERVICE_CATALOG)
        : [category];

      let output = '# UiPath SDK Services\n\n';

      for (const cat of categories) {
        const catData = SERVICE_CATALOG[cat as keyof typeof SERVICE_CATALOG];
        if (!catData) continue;

        output += `## ${catData.name}\n`;
        output += `${catData.description}\n\n`;

        for (const [serviceName, serviceData] of Object.entries(catData.services)) {
          output += `### ${serviceName}\n`;
          output += `${serviceData.description}\n\n`;

          for (const method of serviceData.methods) {
            output += `- **${method.name}**: ${method.description}\n`;
            if (showExamples && method.params.length > 0) {
              output += `  - Parameters: \`${method.params.join(', ')}\`\n`;
            }
          }
          output += '\n';
        }
      }

      output += '\n---\n';
      output += 'Use the MCP tools with prefix `orchestrator_`, `action_center_`, `data_fabric_`, or `maestro_` to call these methods.';

      return {
        content: [{ type: 'text', text: output }]
      };
    }
  );

  // ============================================
  // Tool 3: Generate SDK Code
  // ============================================

  server.tool(
    'uipath_generate_code',
    'Generate TypeScript code for a specific UiPath SDK operation',
    {
      operation: z.string().describe('Operation to generate code for (e.g., "start process", "create queue item", "complete task", "query data service", "list processes")'),
      includeErrorHandling: z.boolean().optional().default(true).describe('Include try/catch error handling'),
      includeTypes: z.boolean().optional().default(true).describe('Include TypeScript type annotations')
    },
    async ({ operation, includeErrorHandling, includeTypes }) => {
      // Find matching template
      const normalizedOp = operation.toLowerCase();
      let template = CODE_TEMPLATES[normalizedOp];

      // Try partial matching if exact match not found
      if (!template) {
        for (const [key, value] of Object.entries(CODE_TEMPLATES)) {
          if (normalizedOp.includes(key) || key.includes(normalizedOp)) {
            template = value;
            break;
          }
        }
      }

      if (!template) {
        // Generate generic template
        return {
          content: [{
            type: 'text',
            text: `No specific template found for "${operation}".

Available operations:
- start process
- create queue item
- complete task
- query data service
- list processes

Here's a generic template to get started:

\`\`\`typescript
import { UiPath } from '@uipath/sdk';

const uipath = new UiPath({
  baseUrl: process.env.UIPATH_BASE_URL,
  orgName: process.env.UIPATH_ORG_NAME,
  tenantName: process.env.UIPATH_TENANT_NAME,
  auth: {
    type: 'pat',
    token: process.env.UIPATH_PAT_TOKEN
  }
});

// Use uipath.orchestrator, uipath.actionCenter, uipath.dataFabric, or uipath.maestro
// to access different services
\`\`\`

Use \`uipath_list_services\` to see all available methods.`
          }]
        };
      }

      let code = template.code;

      if (includeErrorHandling) {
        // Wrap in try/catch
        const lines = code.split('\n');
        const initLines = lines.filter(l => l.includes('const uipath') || l.includes('import') || l.trim() === '' || l.startsWith('//'));
        const actionLines = lines.filter(l => !initLines.includes(l));

        code = initLines.join('\n') + '\n\ntry {\n' +
          actionLines.map(l => '  ' + l).join('\n') +
          '\n} catch (error) {\n  console.error(\'UiPath API Error:\', error.message);\n  throw error;\n}';
      }

      const output = `## ${operation}

${template.explanation}

### Imports
\`\`\`typescript
${template.imports.join('\n')}
\`\`\`

### Code
\`\`\`typescript
${code}
\`\`\`

### Environment Variables Required
- \`UIPATH_BASE_URL\` - UiPath Cloud URL
- \`UIPATH_ORG_NAME\` - Your organization name
- \`UIPATH_TENANT_NAME\` - Your tenant name
- \`UIPATH_PAT_TOKEN\` - Personal Access Token`;

      return {
        content: [{ type: 'text', text: output }]
      };
    }
  );

  // ============================================
  // Tool 4: Get Process Schema
  // ============================================

  server.tool(
    'uipath_get_process_schema',
    'Get the input arguments schema for a specific process',
    {
      processName: z.string().optional().describe('Process name to look up'),
      releaseKey: z.string().optional().describe('Release key of the process'),
      folderId: z.number().describe('Folder ID where the process is deployed')
    },
    async ({ processName, releaseKey, folderId }) => {
      try {
        let process: any;

        if (releaseKey) {
          // getById takes positional args: (id: number, folderId: number)
          // Note: releaseKey is a string, but the API expects numeric ID
          process = await client.processes.getAll({
            filter: `Key eq '${releaseKey}'`,
            folderId
          });
          process = (process as any)?.[0];
        } else if (processName) {
          // List processes and find by name
          const processes = await client.processes.getAll({
            filter: `Name eq '${processName}'`,
            folderId
          });

          if (!processes.items || processes.items.length === 0) {
            return {
              content: [{
                type: 'text',
                text: `Process "${processName}" not found in folder ${folderId}.`
              }],
              isError: true
            };
          }
          process = processes.items[0];
        } else {
          return {
            content: [{
              type: 'text',
              text: 'Please provide either processName or releaseKey.'
            }],
            isError: true
          };
        }

        const output = `# Process Schema: ${process.Name || processName || releaseKey}

## Process Details
- **Key**: ${process.Key || 'N/A'}
- **Version**: ${process.ProcessVersion || 'N/A'}
- **Description**: ${process.Description || 'No description'}

## Input Arguments
${process.Arguments?.Input
  ? Object.entries(process.Arguments.Input).map(([name, schema]: [string, any]) =>
    `- **${name}** (${schema.type || 'any'}): ${schema.description || 'No description'}`
  ).join('\n')
  : 'No input arguments defined'}

## Output Arguments
${process.Arguments?.Output
  ? Object.entries(process.Arguments.Output).map(([name, schema]: [string, any]) =>
    `- **${name}** (${schema.type || 'any'}): ${schema.description || 'No description'}`
  ).join('\n')
  : 'No output arguments defined'}`;

        return {
          content: [{ type: 'text', text: output }]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [{
            type: 'text',
            text: `Error fetching process schema: ${message}`
          }],
          isError: true
        };
      }
    }
  );

  // ============================================
  // Tool 5: Validate Configuration
  // ============================================

  server.tool(
    'uipath_validate_config',
    'Validate the current UiPath SDK configuration and run connectivity checks',
    {},
    async () => {
      const checks: Array<{ name: string; passed: boolean; message: string }> = [];

      // Check environment variables
      checks.push({
        name: 'Base URL',
        passed: !!config.baseUrl,
        message: config.baseUrl || 'Not configured'
      });

      checks.push({
        name: 'Organization',
        passed: !!config.orgName,
        message: config.orgName || 'Not configured'
      });

      checks.push({
        name: 'Tenant',
        passed: !!config.tenantName,
        message: config.tenantName || 'Not configured'
      });

      checks.push({
        name: 'PAT Token',
        passed: !!config.patToken,
        message: config.patToken ? '✓ Configured (hidden)' : 'Not configured'
      });

      checks.push({
        name: 'Folder ID',
        passed: true, // Optional
        message: config.folderId ? String(config.folderId) : 'Not set (optional)'
      });

      // Test Orchestrator connectivity
      try {
        await client.processes.getAll({ pageSize: 1 });
        checks.push({
          name: 'Orchestrator API',
          passed: true,
          message: 'Connected successfully'
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        checks.push({
          name: 'Orchestrator API',
          passed: false,
          message: `Failed: ${message}`
        });
      }

      // Test Action Center connectivity
      try {
        await client.tasks.getAll({ pageSize: 1 });
        checks.push({
          name: 'Action Center API',
          passed: true,
          message: 'Connected successfully'
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        checks.push({
          name: 'Action Center API',
          passed: false,
          message: `Failed: ${message}`
        });
      }

      // Test Data Service connectivity
      try {
        await client.entities.getAll();
        checks.push({
          name: 'Data Service API',
          passed: true,
          message: 'Connected successfully'
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        checks.push({
          name: 'Data Service API',
          passed: false,
          message: `Failed: ${message}`
        });
      }

      const allPassed = checks.every(c => c.passed);
      const passedCount = checks.filter(c => c.passed).length;

      let output = `# UiPath Configuration Validation

## Overall Status: ${allPassed ? '✅ All checks passed' : `⚠️ ${passedCount}/${checks.length} checks passed`}

## Configuration Checks
`;

      for (const check of checks) {
        const icon = check.passed ? '✅' : '❌';
        output += `${icon} **${check.name}**: ${check.message}\n`;
      }

      if (!allPassed) {
        output += `
## Troubleshooting

1. Verify environment variables are set correctly
2. Check that PAT token has required permissions
3. Ensure organization and tenant names are correct
4. Verify network connectivity to UiPath Cloud`;
      }

      return {
        content: [{ type: 'text', text: output }]
      };
    }
  );

  // ============================================
  // Tool 6: Get Available Tools
  // ============================================

  server.tool(
    'uipath_list_tools',
    'List all available MCP tools for UiPath operations',
    {
      category: z.enum(['orchestrator', 'action_center', 'data_fabric', 'maestro', 'dx', 'all'])
        .optional()
        .default('all')
        .describe('Filter tools by category')
    },
    async ({ category }) => {
      const tools = {
        orchestrator: [
          { name: 'orchestrator_processes_getAll', description: 'List all processes' },
          { name: 'orchestrator_processes_getById', description: 'Get process by ID' },
          { name: 'orchestrator_processes_start', description: 'Start a process' },
          { name: 'orchestrator_assets_getAll', description: 'List all assets' },
          { name: 'orchestrator_assets_getById', description: 'Get asset by ID' },
          { name: 'orchestrator_assets_create', description: 'Create an asset' },
          { name: 'orchestrator_queues_getAll', description: 'List all queues' },
          { name: 'orchestrator_queues_addItem', description: 'Add item to queue' },
          { name: 'orchestrator_buckets_getAll', description: 'List all buckets' }
        ],
        action_center: [
          { name: 'action_center_tasks_getAll', description: 'List all tasks' },
          { name: 'action_center_tasks_getById', description: 'Get task by ID' },
          { name: 'action_center_tasks_complete', description: 'Complete a task' }
        ],
        data_fabric: [
          { name: 'data_fabric_entities_getAll', description: 'List all entities' },
          { name: 'data_fabric_entities_getById', description: 'Get entity by ID' },
          { name: 'data_fabric_entities_getRecordsById', description: 'Query entity records' }
        ],
        maestro: [
          { name: 'maestro_processes_getAll', description: 'List Maestro processes' },
          { name: 'maestro_processes_start', description: 'Start Maestro process' }
        ],
        dx: [
          { name: 'uipath_validate_connection', description: 'Validate connection' },
          { name: 'uipath_list_services', description: 'List SDK services' },
          { name: 'uipath_generate_code', description: 'Generate SDK code' },
          { name: 'uipath_get_process_schema', description: 'Get process schema' },
          { name: 'uipath_validate_config', description: 'Validate configuration' },
          { name: 'uipath_list_tools', description: 'List available tools' }
        ]
      };

      const categories = category === 'all' ? Object.keys(tools) : [category];

      let output = '# Available UiPath MCP Tools\n\n';

      for (const cat of categories) {
        const catTools = tools[cat as keyof typeof tools];
        if (!catTools) continue;

        const displayName = cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        output += `## ${displayName}\n\n`;

        for (const tool of catTools) {
          output += `- **${tool.name}**: ${tool.description}\n`;
        }
        output += '\n';
      }

      output += `---\nTotal tools: ${Object.values(tools).flat().length}`;

      return {
        content: [{ type: 'text', text: output }]
      };
    }
  );
}
