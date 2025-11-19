import type { ToolResponse } from '../types/index.js';

/**
 * Format error as MCP tool response
 */
export function formatError(error: unknown): ToolResponse {
  const message = error instanceof Error ? error.message : String(error);

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}

/**
 * Format success response
 */
export function formatSuccess(message: string, data?: any): ToolResponse {
  const text = data
    ? `${message}\n\n${JSON.stringify(data, null, 2)}`
    : message;

  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

/**
 * Format JSON data response
 */
export function formatJsonResponse(data: any): ToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}
