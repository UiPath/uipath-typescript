#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { UiPath } from 'uipath-sdk';
import { TOOL_DEFINITIONS } from './tools/definitions.js';
import { ToolHandlers } from './tools/handlers.js';
import { STATIC_RESOURCES, RESOURCE_TEMPLATES } from './resources/definitions.js';
import { ResourceHandlers } from './resources/handlers.js';
import { loadConfigFromEnv, validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';

/**
 * UiPath MCP Server
 *
 * This server exposes UiPath SDK capabilities to AI assistants via the Model Context Protocol.
 * It provides tools (actions) and resources (read-only data) for automation workflows.
 */

async function main() {
  try {
    // Load configuration from environment variables
    logger.info('Loading configuration...');
    const config = loadConfigFromEnv();
    validateConfig(config);

    // Initialize UiPath SDK
    logger.info('Initializing UiPath SDK...');
    const sdk = new UiPath(config);

    // Initialize handlers
    const toolHandlers = new ToolHandlers(sdk);
    const resourceHandlers = new ResourceHandlers(sdk);

    // Create MCP server
    const server = new Server(
      {
        name: 'uipath-mcp-server',
        version: '1.0.0-beta.1',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Register tool list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Listing available tools');
      return {
        tools: TOOL_DEFINITIONS,
      };
    });

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Tool called: ${name}`);

      const result = await toolHandlers.handleToolCall(name, args);
      return result as any;
    });

    // Register resource list handler (static resources)
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Listing available static resources');
      return {
        resources: STATIC_RESOURCES,
      };
    });

    // Register resource templates list handler (templated resources)
    server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      logger.debug('Listing available resource templates');
      return {
        resourceTemplates: RESOURCE_TEMPLATES,
      };
    });

    // Register resource read handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.info(`Resource read: ${uri}`);

      const result = await resourceHandlers.handleResourceRead(uri);
      return {
        contents: [result],
      };
    });

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('UiPath MCP Server started successfully');
    logger.info(`Tools available: ${TOOL_DEFINITIONS.length}`);
    logger.info(`Static resources available: ${STATIC_RESOURCES.length}`);
    logger.info(`Resource templates available: ${RESOURCE_TEMPLATES.length}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down UiPath MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down UiPath MCP Server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
