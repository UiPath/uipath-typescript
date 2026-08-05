/**
 * Internal types for SDK components.
 * @internal - Not for public use
 */

import { UiPathConfig } from '../config/config';
import { ExecutionContext } from '../context/execution';
import { TokenManager } from '../auth/token-manager';
import { PublicAppClient } from '../http/public-app-client';

/**
 * Private SDK components used by services.
 * @internal
 */
export interface PrivateSDK {
  /** Configuration including base URL, organization name, and tenant name */
  config: UiPathConfig;
  /** Execution context for request tracking and metadata */
  context: ExecutionContext;
  /** Token manager for authentication */
  tokenManager: TokenManager;
  /**
   * Default folder key (GUID), sourced only from `<meta name="uipath:folder-key">`
   * (injected during coded-app deployment). Used by folder-scoped services
   * as a fallback when the caller doesn't supply folder context.
   * Not user-settable via the SDK constructor.
   */
  folderKey?: string;
  /**
   * Present only in public (anonymous) coded-app mode. Routes supported calls
   * through the Apps gateway with a session cookie instead of a user token.
   * @internal
   */
  publicAppClient?: PublicAppClient;
}
