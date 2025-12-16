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
}

// Re-export SDKClientConfig as PrivateSDK alias for compatibility
export type { PrivateSDK as SDKClientConfig };
