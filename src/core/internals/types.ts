/**
 * Internal types for SDK components.
 * @internal - Not for public use
 */

import { UiPathConfig } from '../config/config';
import { ExecutionContext } from '../context/execution';
import { TokenManager } from '../auth/token-manager';

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
   * (injected by jamjam in coded-app deployments). Used by folder-scoped
   * services as a fallback when the caller doesn't supply folder context.
   * Not user-settable via the SDK constructor.
   */
  folderKey?: string;
}
