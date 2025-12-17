// =============================================================================
// PostMessage Utilities
// =============================================================================
// These utilities help communicate between the widget (in iframe) and the
// MCP-UI host application.
// =============================================================================

export type MCPUIAction = {
  type: string;
  [key: string]: unknown;
};

/**
 * Send an action to the parent MCP-UI host
 * The host receives this via the onUIAction prop
 */
export function sendActionToHost(action: MCPUIAction): void {
  if (window.parent !== window) {
    window.parent.postMessage(
      {
        type: 'mcp-ui-action',
        payload: action,
      },
      '*' 
    );
  } else {
    // Not in iframe, log for debugging
    console.log('[Widget] Action (not in iframe):', action);
  }
}

/**
 * Parse URL search params, handling JSON-encoded values
 */
export function getParamAsJSON<T>(key: string, defaultValue: T): T {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(key);

  if (!value) return defaultValue;

  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    console.warn(`Failed to parse param "${key}" as JSON:`, value);
    return defaultValue;
  }
}

/**
 * Get a string param from URL
 */
export function getParam(key: string, defaultValue: string = ''): string {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || defaultValue;
}
