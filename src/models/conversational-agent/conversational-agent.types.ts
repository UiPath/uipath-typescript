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
  /**
   * Optional identifier used in UiPath logs to identify the implementing service of
   * requests. External consumers do not need to set this; the server tags unrecognized
   * or missing values as external automatically.
   */
  surfaceName?: string;
  /**
   * Optional version of the implementing service of requests. Paired with `surfaceName` for
   * internal telemetry.
   */
  surfaceVersion?: string;
  /** Log level for debugging */
  logLevel?: LogLevel;
}
