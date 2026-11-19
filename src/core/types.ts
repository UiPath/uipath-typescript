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
import type { TokenInfo, LogoutOptions } from './auth/types';
import type { DebugContext } from '../models/common/types';

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
   * Returns an access token that is valid right now, renewing it first when it has expired or is about to.
   *
   * Use it for requests your app makes outside the SDK, so they carry the same token as the SDK's own
   * calls. Call it before each request instead of keeping the result: it answers from memory until a
   * renewal is due, and calls made at the same time share one renewal. `getToken()` only reads the
   * token the SDK holds and never renews it.
   *
   * The SDK renews the tokens of its own OAuth sign-in. A token passed as `secret` is returned as it
   * is, and an app embedded in a UiPath host such as Action Center gets its token from the host.
   *
   * Rejects with an `AuthenticationError` when it cannot return a token: the SDK is not signed in, or
   * the renewal failed. A renewal can fail for a temporary reason such as a network error, so retry
   * before calling `initialize()` to sign in again.
   *
   * @returns Promise resolving to a valid access token
   *
   * @example
   * ```typescript
   * const token = await sdk.getValidToken();
   * const { baseUrl, orgName, tenantName } = sdk.config;
   *
   * const response = await fetch(`${baseUrl}/${orgName}/${tenantName}/<servicePath>`, {
   *   headers: { Authorization: `Bearer ${token}` }
   * });
   * ```
   */
  getValidToken(): Promise<string>;

  /**
   * Releases resources held by this SDK instance.
   * Cancels any in-flight token-refresh request. Call this when the coded app is unmounted.
   */
  destroy(): void;

  /**
   * Logout from the SDK, clearing all authentication state.
   * After calling this method, the user will need to re-initialize to authenticate again.
   * Pass `endSession: true` to also end the UiPath platform session.
   */
  logout(options?: LogoutOptions): void;

  /**
   * Updates the access token used for API requests.
   * Use this to inject or refresh a token externally.
   *
   * @param tokenInfo - The token information containing the access token, type, expiration, and optional refresh/ID tokens
   */
  updateToken(tokenInfo: TokenInfo): void;

  /**
   * Sets the debug context for the jobs this instance starts, or clears it with `null`. While set,
   * `Processes.start` carries the parent job key: Orchestrator records it as the parent of the started
   * job and, when that parent is a debug run, routes the job as a debug sub-job of that session.
   * Hosts set this for you: a Studio Web debug session passes the key on the page URL and Action
   * Center sends it with the token of a debug task, so an app calls this only when another host runs
   * it inside a job. A context set here wins over the host's, and `null` keeps the host's key from
   * being applied. Calling this before `initialize()` is fine; the context is applied once the SDK
   * is configured.
   *
   * @param context - The debug context with the parent job key, or `null` to clear it
   *
   * @example
   * ```typescript
   * sdk.setDebugContext({ jobKey: hostJobKey });
   * ```
   */
  setDebugContext(context: DebugContext | null): void;
}
