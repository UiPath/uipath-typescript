import type { LogLevel } from '@/core/websocket';

/**
 * Options for ConversationalAgentService constructor
 */
export interface ConversationalAgentOptions {
  /** External User ID (optional) */
  externalUserId?: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
}
