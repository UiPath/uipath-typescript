#!/usr/bin/env node
/**
 * UiPath MCP Server
 *
 * Model Context Protocol server exposing UiPath SDK methods as tools.
 * Supports stdio, HTTP, and SSE transports.
 */

import { createServer } from './server/index.js';
import { parseArgs } from './utils/args.js';

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Validate required environment variables
  const requiredEnvVars = ['UIPATH_BASE_URL', 'UIPATH_ORG_NAME', 'UIPATH_TENANT_NAME', 'UIPATH_PAT_TOKEN'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingVars.length > 0 && args.transport !== 'http') {
    console.error('Missing required environment variables:', missingVars.join(', '));
    console.error('\nRequired environment variables:');
    console.error('  UIPATH_BASE_URL    - UiPath Cloud URL (e.g., https://cloud.uipath.com)');
    console.error('  UIPATH_ORG_NAME    - Organization name');
    console.error('  UIPATH_TENANT_NAME - Tenant name');
    console.error('  UIPATH_PAT_TOKEN   - Personal Access Token');
    console.error('\nOptional:');
    console.error('  UIPATH_FOLDER_ID   - Default folder ID');
    process.exit(1);
  }

  try {
    const server = await createServer({
      transport: args.transport,
      port: args.port,
      config: {
        baseUrl: process.env.UIPATH_BASE_URL!,
        orgName: process.env.UIPATH_ORG_NAME!,
        tenantName: process.env.UIPATH_TENANT_NAME!,
        patToken: process.env.UIPATH_PAT_TOKEN!,
        folderId: process.env.UIPATH_FOLDER_ID ? parseInt(process.env.UIPATH_FOLDER_ID) : undefined
      }
    });

    // Handle shutdown gracefully
    process.on('SIGINT', async () => {
      console.error('\nShutting down...');
      await server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await server.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();
