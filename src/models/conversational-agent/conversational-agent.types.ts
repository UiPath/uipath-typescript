import type { LogLevel } from '@/core/websocket';

/**
 * Options for ConversationalAgentService constructor
 */
export interface ConversationalAgentOptions {
  /**
   * External user ID required when authenticating via an app-scoped external app
   * (client credential grant). Must be set when the access token was issued for an
   * external app client; omit for standard UiPath user tokens.
   */
  externalUserId?: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
}
