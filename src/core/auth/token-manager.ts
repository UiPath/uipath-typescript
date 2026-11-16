import { ExecutionContext } from '../context/execution';
import { isInActionCenter } from '../../utils/platform';
import { SessionStore } from '../../utils/storage/session-store';
import { LocalStore } from '@/utils/storage/local-store';
import { NO_OP_STORE } from '../../utils/storage/no-op-store';
import type { KeyValueStore } from '../../utils/storage/key-value-store';
import { AuthToken, TokenInfo } from './types';
import { AUTH_STORAGE_KEYS, TOKEN_EXPIRY_BUFFER_MS, TOKEN_REFRESH_LOCK_PREFIX } from './constants';
import { getExpiryMs } from './token-expiry';
import { hasOAuthConfig } from '../config/sdk-config';
import { Config } from '../config/config';
import { AuthenticationError, HttpStatus } from '../errors';
import { ActionCenterTokenManager } from './action-center-token-manager';
import { EmbeddedTokenManager } from './embedded-token-manager';
import { hostEmbeddingOrigin } from './host-token-request';
import { telemetryClient } from '../telemetry';
import { extractUserIdFromToken } from '../../utils/encoding';

/**
 * TokenManager is responsible for managing authentication tokens.
 * It provides token operations for a specific client ID.
 * - For OAuth tokens: Uses session storage with client ID-based keys, or local storage shared by the
 *   tabs of the app when `tokenStorage` asks for it
 * - For Secret tokens: Stores only in memory, allowing multiple instances
 */
export class TokenManager {
  private currentToken?: TokenInfo;
  private refreshPromise: Promise<AuthToken> | null = null;
  private readonly actionCenterTokenManager: ActionCenterTokenManager | null = null;
  private readonly embeddedTokenManager: EmbeddedTokenManager | null = null;
  private readonly tokenChangeListeners: Array<(tokenInfo: TokenInfo | undefined) => void> = [];
  private readonly debugJobKeyListeners: Array<(jobKey: string) => void> = [];
  private readonly store: KeyValueStore;
  // The storage area the session is not kept in: a copy left there by another `tokenStorage` setting is still removed on logout.
  private readonly unusedStore: KeyValueStore;
  // True when the session lives in the store all tabs of the app share, not in this tab's own.
  private readonly sharedAcrossTabs: boolean;
  // False for a session the store did not keep, so its absence there is not taken for a sign-out elsewhere.
  private persisted = false;
  private readonly onStorageChange = (event: StorageEvent): void => {
    // A null key means the whole store was cleared.
    if (event.key === null || event.key === this._getStorageKey()) {
      this._syncWithSharedStore();
    }
  };

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

    const sessionStore = SessionStore.open() ?? NO_OP_STORE;
    const sharedStore = this.isOAuth && config.tokenStorage === 'localStorage' ? LocalStore.open() : undefined;
    this.store = sharedStore ?? sessionStore;
    this.unusedStore = sharedStore ? sessionStore : (this.isOAuth ? LocalStore.open() : undefined) ?? NO_OP_STORE;
    this.sharedAcrossTabs = sharedStore !== undefined;
    if (this.sharedAcrossTabs) {
      // Fires in every other tab when one of them writes or removes the session.
      window.addEventListener('storage', this.onStorageChange);
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
   * @throws AuthenticationError if no token available or refresh fails
   */
  public async getValidToken(): Promise<string> {
    this._syncWithSharedStore();
    const tokenInfo = this.executionContext.get('tokenInfo') as TokenInfo | undefined;

    if (!tokenInfo) {
      throw new AuthenticationError({
        message: 'No authentication token available. Make sure to initialize the SDK first.'
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

    // Token is expired, refresh it
    try {
      const newToken = await this.refreshAccessToken();
      return newToken.access_token;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new AuthenticationError({
        message: `Token refresh failed: ${message}. Please re-authenticate.`,
        statusCode: HttpStatus.UNAUTHORIZED
      });
    }
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

    this.persisted = true;
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
      this.persisted = this.store.write(this._getStorageKey(), tokenInfo);
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
    if (this.sharedAcrossTabs) {
      window.removeEventListener('storage', this.onStorageChange);
    }
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
    this.persisted = false;
    this.currentToken = undefined;
    this._updateExecutionContext(undefined);
    
    if (this.isOAuth) {
      this.store.remove(this._getStorageKey());
      this.unusedStore.remove(this._getStorageKey());
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
      this.refreshPromise = this._withRefreshLock(() => this._doRefreshToken());
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
    // Another tab may have renewed the shared session while this one waited for its turn.
    const renewedElsewhere = this._tokenRenewedElsewhere();
    if (renewedElsewhere) {
      return renewedElsewhere;
    }

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

    const response = await fetch(`${baseUrl}/${orgName}/identity_/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error("Token refresh error:", errorData);
      // Another tab may have redeemed the same refresh token first. What it stored is the session then,
      // and this failure says nothing about it.
      if (this._sessionChangedSince(tokenInfo)) {
        const renewedElsewhere = this._tokenRenewedElsewhere();
        if (renewedElsewhere) {
          return renewedElsewhere;
        }
      } else {
        // Clear the invalid token to prevent further failed requests
        this.clearToken();
      }
      throw new Error(`Failed to refresh access token: ${JSON.stringify(errorData)}`);
    }

    const token = await response.json() as AuthToken;

    // The session ended or changed hands while the request was in flight: a logout or a new sign-in, in
    // this tab or another. The answer belongs to the old session and must not bring it back.
    if (this._sessionChangedSince(tokenInfo)) {
      const current = this._tokenRenewedElsewhere();
      if (current) {
        return current;
      }
      throw new AuthenticationError({ message: 'The session ended while its token was being renewed' });
    }
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
   * Runs a refresh while holding a lock all tabs of the app share, so that two tabs never redeem the
   * same refresh token: Identity accepts each one only once. With the per-tab store, or in a browser
   * without the Web Locks API, the refresh just runs.
   */
  private async _withRefreshLock(refresh: () => Promise<AuthToken>): Promise<AuthToken> {
    const locks = this.sharedAcrossTabs ? globalThis.navigator?.locks : undefined;
    if (!locks) {
      return refresh();
    }
    // The lock is held until the refresh settles, and the request resolves with its result.
    return await locks.request(`${TOKEN_REFRESH_LOCK_PREFIX}${this.config.clientId}`, refresh);
  }

  /**
   * Brings this tab in line with the shared store, where another tab may have renewed the session,
   * signed in or signed out since this tab last looked. Does nothing for the per-tab store.
   */
  private _syncWithSharedStore(): void {
    // A session the store did not keep is this tab's alone: what the store holds says nothing about it.
    if (!this.sharedAcrossTabs || (this.currentToken && !this.persisted)) {
      return;
    }

    const stored = this._parseTokenInfo(this.store.read(this._getStorageKey()));
    const current = this.currentToken;
    if (stored?.token === current?.token && stored?.refreshToken === current?.refreshToken) {
      return;
    }

    // Renewed or signed in from another tab; signed out there when nothing is stored any more.
    this.persisted = stored !== undefined;
    this.currentToken = stored;
    this._updateExecutionContext(stored);
  }

  /** Whether the session is no longer the one `sent` belonged to, here or in the store the tabs share. */
  private _sessionChangedSince(sent: TokenInfo): boolean {
    this._syncWithSharedStore();
    return this.currentToken?.refreshToken !== sent.refreshToken;
  }

  /**
   * The session token when another tab has already renewed it, in the shape a refresh answers with;
   * `undefined` when this tab still has to renew it itself.
   */
  private _tokenRenewedElsewhere(): AuthToken | undefined {
    if (!this.sharedAcrossTabs) {
      return undefined;
    }

    this._syncWithSharedStore();
    const tokenInfo = this.currentToken;
    if (!tokenInfo?.expiresAt || this.isTokenExpired(tokenInfo, TOKEN_EXPIRY_BUFFER_MS)) {
      return undefined;
    }

    return {
      access_token: tokenInfo.token,
      token_type: 'Bearer',
      expires_in: Math.round((getExpiryMs(tokenInfo.expiresAt) - Date.now()) / 1000),
      scope: this.config.scope ?? '',
      refresh_token: tokenInfo.refreshToken,
      id_token: tokenInfo.idToken
    };
  }
}
