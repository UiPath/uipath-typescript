/**
 * IUiPath - Interface for UiPath SDK instance
 *
 * This interface defines the public contract for the UiPath SDK.
 * Services depend on this interface rather than the concrete UiPath class,
 * enabling proper type sharing across modular imports without #private field issues.
 *
 * @internal This interface is for internal SDK use only
 */

import type { BaseConfig } from './config/sdk-config';

export interface IUiPath {
  /** Read-only configuration for the SDK instance */
  readonly config: Readonly<BaseConfig>;

  /**
   * Initialize the SDK based on the provided configuration.
   * For secret-based auth, this returns immediately.
   * For OAuth, this handles the authentication flow.
   */
  initialize(): Promise<void>;

  /**
   * Check if the SDK has been initialized
   */
  isInitialized(): boolean;

  /**
   * Check if we're in an OAuth callback state
   */
  isInOAuthCallback(): boolean;

  /**
   * Complete OAuth authentication flow
   */
  completeOAuth(): Promise<boolean>;

  /**
   * Check if the user is authenticated (has valid token)
   */
  isAuthenticated(): boolean;

  /**
   * Get the current authentication token
   */
  getToken(): string | undefined;
}
