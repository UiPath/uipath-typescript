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
import type { TokenInfo, TokenIdentity } from './auth/types';

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

  /**
   * Retrieves identity claims (email, firstName, lastName, preferredUsername, name)
   * of the currently authenticated user by decoding the JWT access token.
   * Does not work with PAT tokens.
   */
  getTokenIdentity(): TokenIdentity;

  /**
   * Logout from the SDK, clearing all authentication state.
   * After calling this method, the user will need to re-initialize to authenticate again.
   */
  logout(): void;

  /**
   * Updates the access token used for API requests.
   * Use this to inject or refresh a token externally.
   *
   * @param tokenInfo - The token information containing the access token, type, expiration, and optional refresh token
   */
  updateToken(tokenInfo: TokenInfo): void;
}
