# UiPath MCP Server

Model Context Protocol (MCP) server for UiPath SDK - enables AI assistants to interact with UiPath automation platform.

## Installation

```bash
# Build the main SDK first
cd ../..
npm install
npm run build

# Build the MCP server
cd packages/mcp-server
npm install
npm run build
```

## Configuration

The MCP server requires the following environment variables:

- `UIPATH_BASE_URL`: Your UiPath Cloud URL (e.g., `https://cloud.uipath.com` or `https://alpha.uipath.com`)
- `UIPATH_ORG_NAME`: Your organization name
- `UIPATH_TENANT_NAME`: Your tenant name  
- `UIPATH_SECRET`: Your authentication token (PAT or Bearer token)

## Usage with Claude Desktop

Add the following to your Claude Desktop configuration file:

### macOS/Linux
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "uipath": {
      "command": "node",
      "args": ["/Users/swatitiwari/UiPath/sdk-clone/uipath-typescript/packages/mcp-server/dist/index.js"],
      "env": {
        "UIPATH_BASE_URL": "https://alpha.uipath.com",
        "UIPATH_ORG_NAME": "your-org-name",
        "UIPATH_TENANT_NAME": "your-tenant-name",
        "UIPATH_SECRET": "your-secret-token"
      }
    }
  }
}
```

### Alternative: Using npx

If you've published the package to npm:

```json
{
  "mcpServers": {
    "uipath": {
      "command": "npx",
      "args": ["@uipath/mcp-server"],
      "env": {
        "UIPATH_BASE_URL": "https://alpha.uipath.com",
        "UIPATH_ORG_NAME": "your-org-name",
        "UIPATH_TENANT_NAME": "your-tenant-name",
        "UIPATH_SECRET": "your-secret-token"
      }
    }
  }
}
```

## Testing Locally

You can test the server locally with environment variables:

```bash
export UIPATH_BASE_URL="https://alpha.uipath.com"
export UIPATH_ORG_NAME="your-org"
export UIPATH_TENANT_NAME="your-tenant"
export UIPATH_SECRET="your-secret"

npm start
```

## Available Tools

The MCP server exposes the following tools:

### Process Execution
- `uipath_start_process`: Start a process by key or name
- `uipath_cancel_process`: Cancel a running process
- `uipath_control_process_instance`: Pause/resume a process

### Task Management  
- `uipath_get_tasks`: Retrieve Action Center tasks
- `uipath_create_task`: Create a new task
- `uipath_update_task`: Update task (assign, complete, etc.)

### Data Operations
- `uipath_query_entity`: Query Data Service entities
- `uipath_modify_entity`: Insert/update/delete entity records

### File Operations
- `uipath_upload_file`: Upload files to buckets
- `uipath_get_file_url`: Get download URLs for files

### Asset Management
- `uipath_get_assets`: List assets
- `uipath_get_asset_value`: Get asset values

And many more...

## Troubleshooting

### Environment Variables Not Found

If you see an error about missing environment variables:

1. **Check Claude Desktop is restarted**: After updating the config file, fully quit and restart Claude Desktop
2. **Verify config file location**: Make sure the config file is in the correct location
3. **Check JSON syntax**: Ensure the JSON is valid (no trailing commas, proper quotes)
4. **Test locally first**: Run the server locally with environment variables to ensure it works

### Permission Errors

If you get permission errors:
```bash
chmod +x /path/to/dist/index.js
```

### Build Errors

Make sure to build both the main SDK and the MCP server:
```bash
# From repository root
npm run build

# Then build MCP server
cd packages/mcp-server
npm run build
```

## Debug Mode

To enable debug logging, set the `LOG_LEVEL` environment variable:

```json
{
  "mcpServers": {
    "uipath": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "LOG_LEVEL": "debug",
        "UIPATH_BASE_URL": "...",
        // ... other vars
      }
    }
  }
}
```