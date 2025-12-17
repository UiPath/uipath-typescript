import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { createUIResource } from '@mcp-ui/server';

// Widget host URL - change this to your deployed URL in production
const WIDGET_HOST_URL = process.env.WIDGET_HOST_URL || 'http://localhost:3001';

// UiPath SDK config from environment
const UIPATH_CONFIG = {
  baseUrl: process.env.UIPATH_BASE_URL || 'https://alpha.uipath.com',
  orgName: process.env.UIPATH_ORG_NAME || '',
  tenantName: process.env.UIPATH_TENANT_NAME || '',
  secret: process.env.UIPATH_SECRET || '',
};

// Create MCP server
const server = new Server(
  {
    name: 'mcp-ui-demo-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// =============================================================================
// TOOLS - These return MCP-UI resources
// =============================================================================

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'show_datatable_secure',
        description: 'Display a UiPath Data Service entity in an editable DataTable widget. Uses secure initial-render-data for credentials (no credentials in URL).',
        inputSchema: {
          type: 'object',
          properties: {
            entityName: {
              type: 'string',
              description: 'The UiPath Data Service entity name to display',
            },
            pageSize: {
              type: 'number',
              description: 'Number of rows per page (default: 50)',
              default: 50,
            },
            className: {
              type: 'string',
              description: 'Additional CSS class for styling',
            },
          },
          required: ['entityName'],
        },
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'show_datatable_secure': {
      const entityName = args?.entityName as string;
      const pageSize = (args?.pageSize as number) || 50;
      const className = (args?.className as string) || '';

      if (!entityName) {
        return {
          content: [{ type: 'text', text: 'Error: entityName parameter is required' }],
          isError: true,
        };
      }

      // Check if UiPath credentials are configured
      if (!UIPATH_CONFIG.secret) {
        return {
          content: [{
            type: 'text',
            text: 'Error: UiPath credentials not configured. Set UIPATH_SECRET in MCP server environment.',
          }],
          isError: true,
        };
      }

      const widgetUrl = new URL(`${WIDGET_HOST_URL}/widgets/datatable`);
      widgetUrl.searchParams.set('entityName', entityName);
      widgetUrl.searchParams.set('pageSize', String(pageSize));
      widgetUrl.searchParams.set('waitForRenderData', 'true');
      if (className) {
        widgetUrl.searchParams.set('className', className);
      }

      return {
        content: [
          {
            type: 'text',
            text: `Displaying DataTable (secure mode) for entity: ${entityName}. Page size: ${pageSize}. Credentials passed via initial-render-data.`,
          },
          createUIResource({
            uri: `ui://uipath/datatable-secure/${entityName}`,
            content: {
              type: 'externalUrl',
              iframeUrl: widgetUrl.toString(),
            },
            encoding: 'text',
            uiMetadata: {
              'preferred-frame-size': ['900px', '600px'],
              'initial-render-data': {
                credentials: {
                  baseUrl: UIPATH_CONFIG.baseUrl,
                  orgName: UIPATH_CONFIG.orgName,
                  tenantName: UIPATH_CONFIG.tenantName,
                  secret: UIPATH_CONFIG.secret,
                },
              },
            },
          }),
        ],
      };
    }

    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

// =============================================================================
// START SERVER
// =============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP-UI Demo Server running on stdio');
}

main().catch(console.error);
