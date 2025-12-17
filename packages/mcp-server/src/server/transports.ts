/**
 * Transport implementations for HTTP and SSE
 */

import express, { Express, Request, Response } from 'express';
import { Server as HttpServer, createServer } from 'http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

interface TransportResult {
  app: Express;
  httpServer: HttpServer;
}

/**
 * Create HTTP transport using Streamable HTTP
 */
export async function createHttpTransport(
  server: McpServer,
  port: number
): Promise<TransportResult> {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: 'uipath-mcp-server' });
  });

  // MCP endpoint
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });

      res.on('close', () => {
        transport.close();
      });

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // CORS headers for web clients
  app.use((_req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  });

  const httpServer = createServer(app);

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      resolve({ app, httpServer });
    });
  });
}

/**
 * Create SSE transport for streaming responses
 */
export async function createSSETransport(
  server: McpServer,
  port: number
): Promise<TransportResult> {
  const app = express();
  app.use(express.json());

  // Store active SSE connections
  const sseTransports = new Map<string, SSEServerTransport>();

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', server: 'uipath-mcp-server', transport: 'sse' });
  });

  // SSE endpoint for establishing connection
  app.get('/sse', async (req: Request, res: Response) => {
    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const transport = new SSEServerTransport('/message', res);
      const sessionId = generateSessionId();

      sseTransports.set(sessionId, transport);

      // Send session ID to client
      res.write(`data: ${JSON.stringify({ type: 'session', sessionId })}\n\n`);

      await server.connect(transport);

      // Handle client disconnect
      req.on('close', () => {
        sseTransports.delete(sessionId);
        transport.close();
      });
    } catch (error) {
      console.error('Error establishing SSE connection:', error);
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  });

  // Message endpoint for client requests
  app.post('/message', async (req: Request, res: Response) => {
    try {
      const sessionId = req.query.sessionId as string;
      const transport = sseTransports.get(sessionId);

      if (!transport) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      await transport.handlePostMessage(req, res, req.body);
    } catch (error) {
      console.error('Error handling message:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // CORS preflight
  app.options('*', (_req: Request, res: Response) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(204);
  });

  const httpServer = createServer(app);

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      resolve({ app, httpServer });
    });
  });
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
