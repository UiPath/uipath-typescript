import { ExecutionContext } from '../context/execution';
import { isInActionCenter } from '../../utils/platform';
import { SessionStore } from '../../utils/storage/session-store';
import { NO_OP_STORE } from '../../utils/storage/no-op-store';
import type { KeyValueStore } from '../../utils/storage/key-value-store';
import { AuthToken, TokenInfo } from './types';
import { AUTH_STORAGE_KEYS, NO_TOKEN_MESSAGE, TOKEN_EXPIRY_BUFFER_MS } from './constants';
import { getExpiryMs } from './token-expiry';
import { hasOAuthConfig } from '../config/sdk-config';
import { Config } from '../config/config';
import { AuthenticationError, HttpStatus, NetworkError, RateLimitError, ServerError, UiPathError } from '@/core/errors';
import { ErrorFactory } from '@/core/errors/error-factory';
import { parseRetryAfter } from '@/utils/http/retry-policy';
import { ActionCenterTokenManager } from './action-center-token-manager';
import { EmbeddedTokenManager } from './embedded-token-manager';
import { hostEmbeddingOrigin } from './host-token-request';
import { telemetryClient } from '../telemetry';
import { extractUserIdFromToken } from '../../utils/encoding';

/** OAuth error code Identity answers with when the refresh token itself can no longer be used. */
const INVALID_GRANT = 'invalid_grant';
const SESSION_KEPT_NOTE = 'The session is still active, so the request can be retried.';
/** How long a renewal that failed without ending the session is left alone, unless Identity names a wait itself. */
const REFRESH_RETRY_PAUSE_MS = 5_000;
/** Longest wait named by Identity that is followed, so a single answer cannot hold renewals back for long. */
const REFRESH_RETRY_MAX_PAUSE_MS = 60_000;

/** Whether a rejected refresh means the session is over, rather than that this attempt failed. */
function isRefreshTokenRejected(status: number, errorData: unknown): boolean {
  return status === HttpStatus.BAD_REQUEST
    && typeof errorData === 'object'
    && errorData !== null
    && (errorData as { error?: unknown }).error === INVALID_GRANT;
}

/**
 * TokenManager is responsible for managing authentication tokens.
 * It provides token operations for a specific client ID.
 * - For OAuth tokens: Uses session storage with client ID-based keys
 * - For Secret tokens: Stores only in memory, allowing multiple instances
 */
export class TokenManager {
  private currentToken?: TokenInfo;
  private refreshPromise: Promise<AuthToken> | null = null;
  // The last renewal failure that left the session in place and until when renewing is not tried again,
  // so a rate-limited or unreachable Identity is not asked once per request. Tied to the refresh token it
  // was sent with, which makes it lapse as soon as the session changes.
  private refreshPause?: { error: UiPathError; until: number; refreshToken: string };
  private readonly actionCenterTokenManager: ActionCenterTokenManager | null = null;
  private readonly embeddedTokenManager: EmbeddedTokenManager | null = null;
  private readonly tokenChangeListeners: Array<(tokenInfo: TokenInfo | undefined) => void> = [];
  private readonly debugJobKeyListeners: Array<(jobKey: string) => void> = [];
  private readonly store: KeyValueStore = SessionStore.open() ?? NO_OP_STORE;

  /**
   * Creates a new TokenManager instance
   * @param executionContext The execution context
   * @param config The SDK configuration
   * @param isOAuth Whether this is an OAuth-based authentication
   */
  constructor(
    private executionContext: ExecutionContext,
    private config: Config,
    private isOAuth: boolean = false
  ) {
    if (isInActionCenter) {
      this.actionCenterTokenManager = new ActionCenterTokenManager(
        config,
        (tokenInfo) => this.setToken(tokenInfo),
        (jobKey) => this.debugJobKeyListeners.forEach(listener => listener(jobKey))
      );
      this.isOAuth = false;
    } else if (hostEmbeddingOrigin) {
      this.embeddedTokenManager = new EmbeddedTokenManager(hostEmbeddingOrigin, config, tokenInfo => this.setToken(tokenInfo));
      this.isOAuth = false;
    }
  }

  /**
   * Checks if a token is expired
   * @param tokenInfo The token info to check
   * @param bufferMs Safety margin: the token is reported expired this many
   *   milliseconds before its actual expiry. Defaults to 0 (exact expiry).
   * @returns true if the token is expired, false otherwise
   */
  public isTokenExpired(tokenInfo?: TokenInfo, bufferMs: number = 0): boolean {
    // If no token info or no expiration date, token is not expired
    if (!tokenInfo?.expiresAt) {
      return false;
    }

    return Date.now() >= getExpiryMs(tokenInfo.expiresAt) - bufferMs;
  }

  /**
   * Gets a valid authentication token, refreshing if necessary.
   * This is the single source of truth for token validation and refresh logic.
   *
   * @returns The valid token string
   * @throws AuthenticationError if no token is available or the refresh token is rejected; a refresh that
   *   fails for a temporary reason throws the matching NetworkError, RateLimitError or ServerError
   */
  public async getValidToken(): Promise<string> {
    const tokenInfo = this.executionContext.get('tokenInfo') as TokenInfo | undefined;

    if (!tokenInfo) {
      throw new AuthenticationError({
        message: NO_TOKEN_MESSAGE
      });
    }

    if (this.actionCenterTokenManager) {
      return await this.actionCenterTokenManager.refreshAccessToken(tokenInfo);
    }

    // Generic embedded path — active whenever the app is embedded in a UiPath host page
    if (this.embeddedTokenManager) {
      return await this.embeddedTokenManager.refreshAccessToken(tokenInfo);
    }

    // For secret-based tokens, they never expire
    if (tokenInfo.type === 'secret') {
      return tokenInfo.token;
    }

    // Renew a minute early only when the SDK can refresh; otherwise use the token until it actually expires.
    const expiryBuffer = hasOAuthConfig(this.config) && tokenInfo.refreshToken ? TOKEN_EXPIRY_BUFFER_MS : 0;

    // If token is not expired, return it
    if (!this.isTokenExpired(tokenInfo, expiryBuffer)) {
      return tokenInfo.token;
    }

    // Token is expired, refresh it, unless a renewal just failed and is still paused
    let failure: unknown = this._pausedRefreshFailure();
    if (!failure) {
      try {
        const newToken = await this.refreshAccessToken();
        return newToken.access_token;
      } catch (error: unknown) {
        failure = error;
        if (this.hasValidToken()) {
          console.warn('[UiPath SDK] Token refresh failed; using the current token until it expires', error);
        }
      }
    }

    // A renewal ahead of expiry that failed with the session intact must not fail a request the current token can still serve.
    const current = this.getTokenInfo();
    if (current && !this.isTokenExpired(current)) {
      return current.token;
    }

    if (failure instanceof UiPathError) {
      throw failure;
    }

    const message = failure instanceof Error ? failure.message : 'Unknown error';
    throw new AuthenticationError({
      message: `Token refresh failed: ${message}. Please re-authenticate.`,
      statusCode: HttpStatus.UNAUTHORIZED
    });
  }

  /**
   * Gets the storage key for this TokenManager instance
   */
  private _getStorageKey(): string {
    return `${AUTH_STORAGE_KEYS.TOKEN_PREFIX}${this.config.clientId}`;
  }
  
  /**
   * Loads token from session storage if available.
   * An expired access token is still loaded while it has a refresh token, so it can be renewed instead of signing in again.
   * @returns true if a token that has not expired was loaded, false otherwise
   */
  public loadFromStorage(): boolean {
    // Only OAuth tokens are stored in session storage
    if (!this.isOAuth) {
      return false;
    }

    const tokenInfo = this._parseTokenInfo(this.store.read(this._getStorageKey()));
    const isExpired = this.isTokenExpired(tokenInfo);
    if (!tokenInfo || (isExpired && !tokenInfo.refreshToken)) {
      this.store.remove(this._getStorageKey());
      return false;
    }

    this.currentToken = tokenInfo;
    this._updateExecutionContext(tokenInfo);
    return !isExpired;
  }

  /**
   * Parse and validate token info from storage
   * @param stored Value read from storage
   * @returns Valid TokenInfo or undefined if invalid
   */
  private _parseTokenInfo(stored: unknown): TokenInfo | undefined {
    // Basic validation
    if (typeof stored !== 'object' || !stored) {
      return undefined;
    }
    
    const parsed = stored as TokenInfo;
    
    if (typeof parsed.token !== 'string' || !parsed.token) {
      return undefined;
    }
    
    if (parsed.type !== 'secret' && parsed.type !== 'oauth') {
      return undefined;
    }
    
    // Convert string date back to Date object
    if (parsed.expiresAt) {
      parsed.expiresAt = new Date(parsed.expiresAt);
      
      // Verify it's a valid date
      if (isNaN(parsed.expiresAt.getTime())) {
        return undefined;
      }
    }
    
    return parsed;
  }

  /**
   * Sets a new token and updates all necessary contexts
   */
  setToken(tokenInfo: TokenInfo): void {
    this.currentToken = tokenInfo;
    
    // Store token in execution context
    this._updateExecutionContext(tokenInfo);
    
    if (this.isOAuth) {
      this.store.write(this._getStorageKey(), tokenInfo);
    }
  }

  /**
   * Gets the current token information
   */
  getTokenInfo(): TokenInfo | undefined {
    return this.currentToken;
  }

  /**
   * Gets just the token string
   */
  getToken(): string | undefined {
    return this.currentToken?.token;
  }

  /**
   * Gets the OIDC ID token from the current token, if present.
   * Used as `id_token_hint` for RP-initiated logout.
   */
  getIdToken(): string | undefined {
    return this.currentToken?.idToken;
  }

  /**
   * Checks if we have a valid token
   */
  hasValidToken(): boolean {
    if (!this.currentToken) {
      return false;
    }

    if (this.isTokenExpired(this.currentToken)) {
      return false;
    }

    return true;
  }

  /**
   * Releases resources held by this instance.
   * Must be called when the TokenManager is no longer needed to prevent listener leaks.
   */
  destroy(): void {
    this.embeddedTokenManager?.destroy();
  }

  /**
   * Registers a listener called with the current token, then whenever the
   * token is set, loaded or cleared (with `undefined`).
   */
  onTokenChange(listener: (tokenInfo: TokenInfo | undefined) => void): void {
    this.tokenChangeListeners.push(listener);
    listener(this.currentToken);
  }

  /** Registers a listener for the debug job key an Action Center host sends with the token of a debug task. */
  onDebugJobKey(listener: (jobKey: string) => void): void {
    this.debugJobKeyListeners.push(listener);
  }

  /**
   * Clears the current token
   */
  clearToken(): void {
    this.currentToken = undefined;
    this._updateExecutionContext(undefined);
    
    if (this.isOAuth) {
      this.store.remove(this._getStorageKey());
    }
  }
  
  /**
   * Updates execution context with token information
   */
  private _updateExecutionContext(tokenInfo: TokenInfo | undefined): void {
    this.executionContext.set('tokenInfo', tokenInfo);
    if (tokenInfo) telemetryClient.setUserId(extractUserIdFromToken(tokenInfo.token));
    this.tokenChangeListeners.forEach((listener) => listener(tokenInfo));
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * This method only works for OAuth flow.
   * Uses a lock mechanism to prevent multiple simultaneous refreshes.
   * @returns A promise that resolves to the new AuthToken
   * @throws Error if not in OAuth flow, refresh token is missing, or the request fails
   */
  public async refreshAccessToken(): Promise<AuthToken> {
    // If there's already a refresh in progress, return that promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    try {
      // Create new refresh promise
      this.refreshPromise = this._doRefreshToken();
      // Wait for refresh to complete
      const result = await this.refreshPromise;
      return result;
    } finally {
      // Clear the refresh promise when done (success or failure)
      this.refreshPromise = null;
    }
  }

  /**
   * Internal method to perform the actual token refresh
   */
  private async _doRefreshToken(): Promise<AuthToken> {
    // Destructure before the type guard — hasOAuthConfig narrows this.config to
    // { clientId, redirectUri, scope } which does not include BaseConfig fields.
    const { orgName, baseUrl } = this.config;

    // Check if we're in OAuth flow
    if (!hasOAuthConfig(this.config)) {
      throw new Error('refreshAccessToken is only available in OAuth flow');
    }

    // Get current token info from token manager
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo?.refreshToken) {
      throw new Error('No refresh token available. User may need to re-authenticate.');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: tokenInfo.refreshToken
    });

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/${orgName}/identity_/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });
    } catch (error: unknown) {
      // No answer from Identity, so nothing says the session is over.
      const reason = ErrorFactory.createNetworkError(error).message;
      throw this._pauseRefresh(
        new NetworkError({ message: `Token refresh failed: ${reason}. ${SESSION_KEPT_NOTE}` }),
        tokenInfo.refreshToken
      );
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error("Token refresh error:", errorData);
      throw this._toRefreshError(response, errorData, tokenInfo.refreshToken);
    }

    const token = await response.json() as AuthToken;
    this.setToken({
      token: token.access_token,
      type: 'oauth',
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      refreshToken: token.refresh_token,
      // A refresh response may omit id_token — keep the one from initial login.
      idToken: token.id_token ?? tokenInfo.idToken
    });
    return token;
  }

  /**
   * The error to raise for a refresh Identity answered with a failure. Only `invalid_grant` says the
   * refresh token is dead, so only it ends the session. A rate limit, a server error or any other
   * answer leaves the session in place, and renewing is tried again after a pause.
   */
  private _toRefreshError(response: Response, errorData: unknown, refreshToken: string): UiPathError {
    const { status } = response;
    const detail = `Failed to refresh access token: ${JSON.stringify(errorData)}`;

    if (isRefreshTokenRejected(status, errorData)) {
      // Clear the invalid token to prevent further failed requests
      this.clearToken();
      return new AuthenticationError({ message: `Token refresh failed: ${detail}. Please re-authenticate.` });
    }

    const pauseMs = parseRetryAfter(response.headers.get('retry-after'));
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      const message = `Token refresh failed: ${detail} (HTTP ${status}). ${SESSION_KEPT_NOTE}`;
      return this._pauseRefresh(new RateLimitError({ message }), refreshToken, pauseMs);
    }
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      const message = `Token refresh failed: ${detail} (HTTP ${status}). ${SESSION_KEPT_NOTE}`;
      return this._pauseRefresh(new ServerError({ message, statusCode: status }), refreshToken, pauseMs);
    }

    // Always a 401, whatever Identity answered: the session license reads a 400 or a 403 as "no license
    // to be had" and stops asking for one.
    const message = `Token refresh failed: ${detail} (HTTP ${status}). The session was not ended.`;
    return this._pauseRefresh(new AuthenticationError({ message }), refreshToken, pauseMs);
  }

  /** Records a renewal failure that left the session in place, so the next attempt waits; returns the error. */
  private _pauseRefresh(error: UiPathError, refreshToken: string, pauseMs: number = REFRESH_RETRY_PAUSE_MS): UiPathError {
    this.refreshPause = { error, refreshToken, until: Date.now() + Math.min(pauseMs, REFRESH_RETRY_MAX_PAUSE_MS) };
    return error;
  }

  /** The failure of the last renewal while its pause lasts and the session is still the one it was sent for. */
  private _pausedRefreshFailure(): UiPathError | undefined {
    const pause = this.refreshPause;
    if (!pause || Date.now() >= pause.until || pause.refreshToken !== this.currentToken?.refreshToken) {
      return undefined;
    }
    return pause.error;
  }
}
