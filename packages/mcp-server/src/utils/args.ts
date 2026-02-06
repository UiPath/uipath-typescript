/**
 * Command line argument parser
 */

export type TransportType = 'stdio' | 'http' | 'sse';

export interface ParsedArgs {
  transport: TransportType;
  port: number;
  help: boolean;
}

export function parseArgs(args: string[]): ParsedArgs {
  const result: ParsedArgs = {
    transport: 'stdio',
    port: 3000,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      printHelp();
      process.exit(0);
    }

    if (arg === '--transport' || arg === '-t') {
      const value = args[++i];
      if (value === 'stdio' || value === 'http' || value === 'sse') {
        result.transport = value;
      } else {
        console.error(`Invalid transport: ${value}. Must be one of: stdio, http, sse`);
        process.exit(1);
      }
    }

    if (arg === '--port' || arg === '-p') {
      const value = parseInt(args[++i]);
      if (isNaN(value)) {
        console.error('Invalid port number');
        process.exit(1);
      }
      result.port = value;
    }
  }

  return result;
}

function printHelp(): void {
  console.log(`
UiPath MCP Server

Usage: uipath-mcp [options]

Options:
  -t, --transport <type>  Transport type: stdio, http, or sse (default: stdio)
  -p, --port <number>     Port for HTTP/SSE transport (default: 3000)
  -h, --help              Show this help message

Environment Variables:
  UIPATH_BASE_URL         UiPath Cloud URL (required)
  UIPATH_ORG_NAME         Organization name (required)
  UIPATH_TENANT_NAME      Tenant name (required)
  UIPATH_PAT_TOKEN        Personal Access Token (required)
  UIPATH_FOLDER_ID        Default folder ID (optional)

Examples:
  # Run with stdio transport (for Claude Desktop)
  uipath-mcp

  # Run with HTTP transport
  uipath-mcp --transport http --port 3001

  # Run with SSE transport
  uipath-mcp --transport sse --port 3002
`);
}
