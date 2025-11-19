/**
 * Simple logger that writes to stderr (stdout is reserved for MCP protocol)
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.error(`[INFO] ${message}`, ...args);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.DEBUG === 'true') {
      console.error(`[DEBUG] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: any[]) => {
    console.error(`[WARN] ${message}`, ...args);
  },
};
