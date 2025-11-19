# UiPath MCP Server

> Model Context Protocol (MCP) server for the UiPath TypeScript SDK - enables AI assistants to interact with the UiPath automation platform

## Overview

The UiPath MCP Server exposes UiPath automation capabilities to AI assistants like Claude through the Model Context Protocol. This allows natural language interaction with UiPath processes, tasks, data, and more.

## Features

- **16 Tools** - Action-oriented operations for starting processes, managing tasks, modifying data
- **27 Resources** - Read-only data sources for browsing processes, tasks, entities, and more
- **Full TypeScript** - Type-safe implementation with comprehensive error handling
- **Easy Configuration** - Simple environment variable setup
- **Production Ready** - Built on the official UiPath TypeScript SDK

## Quick Start

### Installation

#### Option 1: NPM (Recommended)

```bash
npm install -g @uipath/mcp-server
```

#### Option 2: From Source

```bash
cd packages/mcp-server
npm install
npm run build
```

### Configuration

Create a configuration file for Claude Desktop:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uipath": {
      "command": "npx",
      "args": ["-y", "@uipath/mcp-server"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com",
        "UIPATH_ORG_NAME": "your-org-name",
        "UIPATH_TENANT_NAME": "your-tenant-name",
        "UIPATH_SECRET": "your-personal-access-token"
      }
    }
  }
}
```

**For local development:**

```json
{
  "mcpServers": {
    "uipath": {
      "command": "node",
      "args": ["/absolute/path/to/packages/mcp-server/dist/index.js"],
      "env": {
        "UIPATH_BASE_URL": "https://cloud.uipath.com",
        "UIPATH_ORG_NAME": "your-org-name",
        "UIPATH_TENANT_NAME": "your-tenant-name",
        "UIPATH_SECRET": "your-personal-access-token"
      }
    }
  }
}
```

### Getting Your Credentials

1. **Base URL**: Your UiPath Cloud URL (e.g., `https://cloud.uipath.com`)
2. **Org Name**: Found in your UiPath Cloud URL: `https://cloud.uipath.com/{orgName}/{tenantName}`
3. **Tenant Name**: Found in your UiPath Cloud URL
4. **Secret**: Generate a Personal Access Token:
   - Go to UiPath Cloud → Admin → External Applications
   - Create a new External Application
   - Generate a Personal Access Token (PAT)
   - Copy the token value

### Testing

Restart Claude Desktop, then try:

```
User: "Show me all my Action Center tasks"
Claude: [Reads from uipath://tasks resource]

User: "Start the MonthlyReport process in folder 123"
Claude: [Calls uipath_start_process tool]
```

## Available Tools

Tools are **actions** that modify state or perform operations:

### Process Execution
- `uipath_start_process` - Start an Orchestrator process
- `uipath_cancel_process` - Cancel a running Maestro instance
- `uipath_control_process_instance` - Pause or resume an instance

### Task Management
- `uipath_create_task` - Create a new Action Center task
- `uipath_update_task` - Assign, complete, or update a task

### Data Operations
- `uipath_query_entity` - Query Data Fabric entities
- `uipath_modify_entity` - Insert, update, or delete entity records

### File Operations
- `uipath_upload_file` - Upload file to storage bucket
- `uipath_get_file_url` - Get download URL for a file

### Asset Management
- `uipath_get_asset_value` - Retrieve asset value

### Queue Operations
- `uipath_add_queue_item` - Add item to queue
- `uipath_get_queue_item` - Get queue item details

## Available Resources

Resources are **read-only** data sources that AI can browse:

### Tasks
- `uipath://tasks` - List all tasks
- `uipath://tasks/{taskId}` - Task details
- `uipath://tasks/users` - Task-eligible users

### Processes
- `uipath://processes` - Orchestrator processes
- `uipath://processes/{processId}` - Process details
- `uipath://maestro/processes` - Maestro processes
- `uipath://maestro/processes/{key}` - Maestro process details

### Process Instances
- `uipath://maestro/instances` - All instances
- `uipath://maestro/instances/{id}` - Instance details
- `uipath://maestro/instances/{id}/variables` - Instance variables
- `uipath://maestro/instances/{id}/history` - Execution history
- `uipath://maestro/instances/{id}/incidents` - Instance incidents
- `uipath://maestro/instances/{id}/bpmn` - BPMN XML

### Data Fabric
- `uipath://entities` - All entities
- `uipath://entities/{id}` - Entity schema
- `uipath://entities/{id}/records` - Entity data

### Storage & Configuration
- `uipath://assets` - All assets
- `uipath://assets/{id}` - Asset details
- `uipath://queues` - All queues
- `uipath://queues/{id}` - Queue details
- `uipath://buckets` - Storage buckets
- `uipath://buckets/{id}/files` - Bucket files

### Cases
- `uipath://cases` - Case management processes
- `uipath://case-instances/{id}` - Case instance details

## Usage Examples

### Starting a Process

```
User: "Start the InvoiceProcessing process in folder 12345 with input {invoiceId: 'INV-001'}"

Claude uses: uipath_start_process
{
  "processKey": "InvoiceProcessing",
  "folderId": 12345,
  "inputArguments": {
    "invoiceId": "INV-001"
  }
}

Result: "Process started successfully! Job Key: abc-123-def"
```

### Managing Tasks

```
User: "Show me my high-priority tasks"
Claude reads: uipath://tasks
Filters for high priority tasks

User: "Assign task 567 to user 890"
Claude uses: uipath_update_task
{
  "action": "assign",
  "taskId": 567,
  "userId": 890,
  "folderId": 12345
}
```

### Querying Data

```
User: "Show me all customers from California"
Claude uses: uipath_query_entity
{
  "entityId": "customer-entity-uuid",
  "operation": "records",
  "filter": "state eq 'CA'",
  "pageSize": 100
}
```

### Checking Process Status

```
User: "What's the status of process instance abc-123?"
Claude reads: uipath://maestro/instances/abc-123

User: "Show me the variables for that instance"
Claude reads: uipath://maestro/instances/abc-123/variables
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architectural decisions and design rationale.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Clean
npm run clean
```

## Troubleshooting

### Server doesn't start

1. Check that all environment variables are set correctly
2. Verify your credentials have proper permissions
3. Check the Claude Desktop logs (Help → View Logs)

### Tools/Resources not working

1. Ensure your PAT has the required scopes
2. Check folder IDs are correct
3. Enable debug logging: `"DEBUG": "true"` in config

### Connection errors

1. Verify `UIPATH_BASE_URL` is correct
2. Check network connectivity to UiPath Cloud
3. Ensure firewall/proxy settings allow connections

## Security Best Practices

1. **Never commit credentials** - Use environment variables only
2. **Use least-privilege PATs** - Grant only required permissions
3. **Rotate tokens regularly** - Generate new PATs periodically
4. **Secure config files** - Restrict access to Claude config file
5. **Monitor usage** - Review audit logs in UiPath Cloud

## Contributing

Contributions are welcome! Please read the contributing guidelines in the main repository.

## License

MIT License - see LICENSE file for details

## Resources

- [UiPath TypeScript SDK](../../README.md)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Claude Desktop](https://claude.ai/download)
- [UiPath Cloud](https://cloud.uipath.com)

## Support

For issues and questions:
- [GitHub Issues](https://github.com/UiPath/uipath-typescript/issues)
- [UiPath Community Forum](https://forum.uipath.com)
