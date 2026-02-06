/**
 * MCP Server Implementation
 *
 * Creates and configures the MCP server with SDK tools and DX tools.
 * Supports stdio, HTTP, and SSE transports.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createHttpTransport, createSSETransport } from './transports.js';
import { registerSDKTools } from '../tools/generated/sdk-tools.js';
import { registerDXTools } from '../tools/dx-tools.js';
import type { TransportType } from '../utils/args.js';

// Import the real UiPath SDK (use bundled .mjs for ESM compatibility)
import { UiPath } from '../../../../dist/index.mjs';

export interface UiPathConfig {
  baseUrl: string;
  orgName: string;
  tenantName: string;
  patToken: string;
  folderId?: number;
}

export interface ServerOptions {
  transport: TransportType;
  port: number;
  config: UiPathConfig;
}

export interface ServerInstance {
  server: McpServer;
  close: () => Promise<void>;
}

/**
 * Create and start the MCP server
 */
export async function createServer(options: ServerOptions): Promise<ServerInstance> {
  const { transport, port, config } = options;

  // Create MCP server instance
  const server = new McpServer({
    name: 'uipath-mcp-server',
    version: '1.0.0'
  });

  // Initialize UiPath SDK client
  // Note: In production, this would use the actual SDK
  // For now, we create a mock client structure
  const uipathClient = createUiPathClient(config);

  // Register all tools
  registerSDKTools(server, uipathClient);
  registerDXTools(server, uipathClient, config);

  // Start the appropriate transport
  let closeFunction: () => Promise<void>;

  switch (transport) {
    case 'stdio':
      closeFunction = await startStdioTransport(server);
      break;
    case 'http':
      closeFunction = await startHttpTransport(server, port);
      break;
    case 'sse':
      closeFunction = await startSSETransport(server, port);
      break;
    default:
      throw new Error(`Unknown transport: ${transport}`);
  }

  return {
    server,
    close: closeFunction
  };
}

/**
 * Start stdio transport (for Claude Desktop)
 */
async function startStdioTransport(server: McpServer): Promise<() => Promise<void>> {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('UiPath MCP Server started (stdio transport)');

  return async () => {
    await transport.close();
  };
}

/**
 * Start HTTP transport (for web applications)
 */
async function startHttpTransport(server: McpServer, port: number): Promise<() => Promise<void>> {
  const { app, httpServer } = await createHttpTransport(server, port);

  console.error(`UiPath MCP Server started on http://localhost:${port}/mcp`);

  return async () => {
    return new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
  };
}

/**
 * Start SSE transport (for streaming responses)
 */
async function startSSETransport(server: McpServer, port: number): Promise<() => Promise<void>> {
  const { app, httpServer } = await createSSETransport(server, port);

  console.error(`UiPath MCP Server started with SSE on http://localhost:${port}/sse`);

  return async () => {
    return new Promise((resolve) => {
      httpServer.close(() => resolve());
    });
  };
}

/**
 * Create UiPath SDK client using the real SDK
 */
function createUiPathClient(config: UiPathConfig): UiPath {
  return new UiPath({
    baseUrl: config.baseUrl,
    orgName: config.orgName,
    tenantName: config.tenantName,
    secret: config.patToken  // PAT token goes in 'secret' field
  });
}

export type UiPathClient = UiPath;
