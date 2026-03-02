import { ExecutionContext } from '../context/execution';
import { isBrowser, isInActionCenter } from '../../utils/platform';
import { AuthToken, TokenInfo } from './types';
import { AUTH_STORAGE_KEYS } from './constants';
import { hasOAuthConfig } from '../config/sdk-config';
import { Config } from '../config/config';
import { AuthenticationError, HttpStatus } from '../errors';
import { ActionCenterTokenManager } from './action-center-token-manager';

/**
 * TokenManager is responsible for managing authentication tokens.
 * It provides token operations for a specific client ID.
 * - For OAuth tokens: Uses session storage with client ID-based keys
 * - For Secret tokens: Stores only in memory, allowing multiple instances
 */
export class TokenManager {
  private currentToken?: TokenInfo;
  private refreshPromise: Promise<AuthToken> | null = null;
  private readonly actionCenterTokenManager: ActionCenterTokenManager | null = null;

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
      this.actionCenterTokenManager = new ActionCenterTokenManager(config, (tokenInfo) => this.setToken(tokenInfo));
      this.isOAuth = false;
    }
  }

  /**
   * Checks if a token is expired
   * @param tokenInfo The token info to check
   * @returns true if the token is expired, false otherwise
   */
  public isTokenExpired(tokenInfo?: TokenInfo): boolean {
    // If no token info or no expiration date, token is not expired
    if (!tokenInfo?.expiresAt) {
      return false;
    }

    return new Date() >= tokenInfo.expiresAt;
  }

  /**
   * Gets a valid authentication token, refreshing if necessary.
   * This is the single source of truth for token validation and refresh logic.
   *
   * @returns The valid token string
   * @throws AuthenticationError if no token available or refresh fails
   */
  public async getValidToken(): Promise<string> {
    const tokenInfo = this.executionContext.get('tokenInfo') as TokenInfo | undefined;

    if (!tokenInfo) {
      throw new AuthenticationError({
        message: 'No authentication token available. Make sure to initialize the SDK first.'
      });
    }

    if (this.actionCenterTokenManager) {
      return await this.actionCenterTokenManager.refreshAccessToken(tokenInfo);
    }

    // For secret-based tokens, they never expire
    if (tokenInfo.type === 'secret') {
      return tokenInfo.token;
    }

    // If token is not expired, return it
    if (!this.isTokenExpired(tokenInfo)) {
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
   * Loads token from session storage if available
   * @returns true if a valid token was loaded, false otherwise
   */
  public loadFromStorage(): boolean {
    // Only OAuth tokens are stored in session storage
    if (!isBrowser || !this.isOAuth) {
      return false;
    }
    
    try {
      const storedToken = sessionStorage.getItem(this._getStorageKey());
      if (!storedToken) {
        return false;
      }
      
      const tokenInfo = this._parseTokenInfo(storedToken);
      if (!tokenInfo) {
        // Invalid token format, clear it
        sessionStorage.removeItem(this._getStorageKey());
        return false;
      }
      
      // Check if token is expired
      if (this.isTokenExpired(tokenInfo)) {
        // Token expired, clear it
        sessionStorage.removeItem(this._getStorageKey());
        return false;
      }
      
      // Valid token found, use it
      this.currentToken = tokenInfo;
      this._updateExecutionContext(tokenInfo);
      return true;
    } catch (error) {
      console.warn('Failed to load token from session storage', error);
      return false;
    }
  }
  
  /**
   * Parse and validate token info from storage
   * @param storedToken JSON string from storage
   * @returns Valid TokenInfo or undefined if invalid
   */
  private _parseTokenInfo(storedToken: string): TokenInfo | undefined {
    try {
      const parsed = JSON.parse(storedToken);
      
      // Basic validation
      if (typeof parsed !== 'object' || !parsed) {
        return undefined;
      }
      
      if (typeof parsed.token !== 'string' || !parsed.token) {
        return undefined;
      }
      
      if (parsed.type !== 'secret' && parsed.type !== 'oauth') {
        return undefined;
      }
      
      const tokenInfo = parsed as TokenInfo;
      
      // Convert string date back to Date object
      if (tokenInfo.expiresAt) {
        tokenInfo.expiresAt = new Date(tokenInfo.expiresAt);
        
        // Verify it's a valid date
        if (isNaN(tokenInfo.expiresAt.getTime())) {
          return undefined;
        }
      }
      
      return tokenInfo;
    } catch (error) {
      console.warn('Failed to parse token info', error);
      return undefined;
    }
  }

  /**
   * Sets a new token and updates all necessary contexts
   */
  setToken(tokenInfo: TokenInfo): void {
    this.currentToken = tokenInfo;
    
    // Store token in execution context
    this._updateExecutionContext(tokenInfo);
    
    // Store in session storage if in browser and this is an OAuth token
    if (isBrowser && this.isOAuth) {
      try {
        sessionStorage.setItem(this._getStorageKey(), JSON.stringify(tokenInfo));
      } catch (error) {
        console.warn('Failed to store token in session storage', error);
      }
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
   * Clears the current token
   */
  clearToken(): void {
    this.currentToken = undefined;
    this.executionContext.set('tokenInfo', undefined);
    
    // Remove from session storage if this is an OAuth token
    if (isBrowser && this.isOAuth) {
      try {
        sessionStorage.removeItem(this._getStorageKey());
      } catch (error) {
        console.warn('Failed to remove token from session storage', error);
      }
    }
  }
  
  /**
   * Updates execution context with token information
   */
  private _updateExecutionContext(tokenInfo: TokenInfo): void {
    this.executionContext.set('tokenInfo', tokenInfo);
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
    // Check if we're in OAuth flow
    if (!hasOAuthConfig(this.config)) {
      throw new Error('refreshAccessToken is only available in OAuth flow');
    }

    // Get current token info from token manager
    const tokenInfo = this.getTokenInfo();
    if (!tokenInfo?.refreshToken) {
      throw new Error('No refresh token available. User may need to re-authenticate.');
    }

    const orgName = this.config.orgName;
    
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      refresh_token: tokenInfo.refreshToken
    });

    const response = await fetch(`${this.config.baseUrl}/${orgName}/identity_/connect/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      console.error("Token refresh error:", errorData);
      // Clear the invalid token to prevent further failed requests
      this.clearToken();
      throw new Error(`Failed to refresh access token: ${JSON.stringify(errorData)}`);
    }

    const token = await response.json() as AuthToken;
    this.setToken({
      token: token.access_token,
      type: 'oauth',
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      refreshToken: token.refresh_token
    });
    return token;
  }
}
