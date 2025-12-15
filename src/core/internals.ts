import { UiPathConfig } from './config/config';
import { ExecutionContext } from './context/execution';
import { TokenManager } from './auth/token-manager';

/**
 * Symbol key for accessing private SDK components.
 * Not exposed in public API - for internal SDK use only.
 * @internal
 */
export const __PRIVATE__ = Symbol.for('uipath.private');

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
