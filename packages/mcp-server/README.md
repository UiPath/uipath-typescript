# @uipath/mcp-server

MCP (Model Context Protocol) server exposing UiPath SDK methods as tools for AI assistants like Claude.

## Features

- **Auto-generated SDK tools**: All SDK methods are automatically exposed as MCP tools
- **Developer Experience tools**: Code generation, service listing, connection validation
- **Multiple transports**: stdio (Claude Desktop), HTTP, SSE
- **PAT token authentication**: Secure authentication via environment variables
- **Watch mode**: Automatically regenerate tools when SDK changes

## Installation

```bash
npm install @uipath/mcp-server
```

## Quick Start

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uipath": {
      "command": "npx",
      "args": ["@uipath/mcp-server"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com",
        "UIPATH_ORG_NAME": "your-org",
        "UIPATH_TENANT_NAME": "your-tenant",
        "UIPATH_PAT_TOKEN": "your-pat-token"
      }
    }
  }
}
```

### HTTP Server

```bash
# Set environment variables
export UIPATH_BASE_URL="https://cloud.uipath.com"
export UIPATH_ORG_NAME="your-org"
export UIPATH_TENANT_NAME="your-tenant"
export UIPATH_PAT_TOKEN="your-pat-token"

# Start HTTP server
npx @uipath/mcp-server --transport http --port 3000
```

### SSE Server

```bash
npx @uipath/mcp-server --transport sse --port 3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `UIPATH_BASE_URL` | Yes | UiPath Cloud URL (e.g., `https://cloud.uipath.com`) |
| `UIPATH_ORG_NAME` | Yes | Organization name |
| `UIPATH_TENANT_NAME` | Yes | Tenant name |
| `UIPATH_PAT_TOKEN` | Yes | Personal Access Token |
| `UIPATH_FOLDER_ID` | No | Default folder ID for operations |

## Available Tools

### SDK Tools (Auto-generated)

#### Orchestrator
- `orchestrator_processes_getAll` - List all processes
- `orchestrator_processes_getById` - Get process by ID
- `orchestrator_processes_start` - Start a process
- `orchestrator_assets_getAll` - List all assets
- `orchestrator_assets_getById` - Get asset by ID
- `orchestrator_assets_create` - Create an asset
- `orchestrator_queues_getAll` - List all queues
- `orchestrator_queues_addItem` - Add item to queue
- `orchestrator_buckets_getAll` - List all buckets

#### Action Center
- `action_center_tasks_getAll` - List all tasks
- `action_center_tasks_getById` - Get task by ID
- `action_center_tasks_complete` - Complete a task

#### Data Fabric
- `data_fabric_entities_getAll` - List all entities
- `data_fabric_entities_getById` - Get entity by ID
- `data_fabric_entities_getRecordsById` - Query entity records

#### Maestro
- `maestro_processes_getAll` - List Maestro processes
- `maestro_processes_start` - Start a Maestro process

### DX Tools (Manual)

- `uipath_validate_connection` - Verify UiPath connection
- `uipath_list_services` - List all SDK services
- `uipath_generate_code` - Generate TypeScript code for operations
- `uipath_get_process_schema` - Get process input/output schema
- `uipath_validate_config` - Validate configuration
- `uipath_list_tools` - List all available MCP tools

## Development

### Regenerate SDK Tools

When SDK methods change, regenerate the tools:

```bash
# One-time generation
npm run generate

# Watch mode (auto-regenerate on changes)
npm run generate:watch
```

### CLI Commands

```bash
# Generate tools
npm run generate

# List discovered services
npx tsx src/generator/cli.ts list

# Validate configuration
npx tsx src/generator/cli.ts validate
```

### Configuration

Edit `src/generator/config.ts` to customize:

```typescript
const config: MCPGeneratorConfig = {
  sdkPath: '../../../src',
  outputPath: '../tools/generated',

  services: {
    include: [], // Empty = all services
    exclude: []
  },

  methods: {
    exclude: [
      '*._*',           // Internal methods
      'BaseService.*'   // Base class methods
    ],
    overrides: {
      'ProcessService.start': {
        description: 'Custom description',
        inputSchema: {
          folderId: { required: true }
        }
      }
    }
  },

  naming: {
    toolPrefix: '',
    separator: '_',
    style: 'snake_case'
  }
};
```

## Example Conversations

```
User: "List all processes in folder 123"
Claude: [Uses orchestrator_processes_getAll with folderId=123]

User: "Start the InvoiceProcessor process"
Claude: [Uses orchestrator_processes_start with name="InvoiceProcessor"]

User: "Generate code to add a queue item"
Claude: [Uses uipath_generate_code with operation="create queue item"]
```

## API Reference

### HTTP Endpoints

- `GET /health` - Health check
- `POST /mcp` - MCP requests (HTTP transport)

### SSE Endpoints

- `GET /health` - Health check
- `GET /sse` - Establish SSE connection
- `POST /message?sessionId=xxx` - Send messages

## License

MIT
