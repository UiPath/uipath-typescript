import { ExecutionContext } from '../context/executionContext';
import { isBrowser } from '../../utils/platform';

export interface TokenInfo {
  token: string;
  type: 'secret' | 'oauth';
  expiresAt?: Date;
}

/**
 * TokenManager is responsible for managing authentication tokens.
 * It provides token operations for a specific client ID.
 * - For OAuth tokens: Uses session storage with client ID-based keys
 * - For Secret tokens: Stores only in memory, allowing multiple instances
 */
export class TokenManager {
  private currentToken?: TokenInfo;
  private readonly clientId: string;
  private readonly STORAGE_KEY_PREFIX = 'uipath_sdk_user_token-';
  
  /**
   * Creates a new TokenManager instance for a specific client ID
   * @param executionContext The execution context
   * @param clientId The client ID to use for token storage
   * @param isOAuth Whether this is an OAuth-based authentication
   */
  constructor(
    private executionContext: ExecutionContext, 
    clientId: string,
    private isOAuth: boolean = false
  ) {
    this.clientId = clientId;
  }

  /**
   * Checks if a token is expired
   * @param tokenInfo The token info to check
   * @returns true if the token is expired, false otherwise
   */
  public static isTokenExpired(tokenInfo?: TokenInfo): boolean {
    // If no token info or no expiration date, token is not expired
    if (!tokenInfo?.expiresAt) {
      return false;
    }
    
    return new Date() >= tokenInfo.expiresAt;
  }
  
  /**
   * Gets the storage key for this TokenManager instance
   */
  private get storageKey(): string {
    return `${this.STORAGE_KEY_PREFIX}${this.clientId}`;
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
      const storedToken = sessionStorage.getItem(this.storageKey);
      if (!storedToken) {
        return false;
      }
      
      const tokenInfo = this._parseTokenInfo(storedToken);
      if (!tokenInfo) {
        // Invalid token format, clear it
        sessionStorage.removeItem(this.storageKey);
        return false;
      }
      
      // Check if token is expired
      if (TokenManager.isTokenExpired(tokenInfo)) {
        // Token expired, clear it
        sessionStorage.removeItem(this.storageKey);
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
        sessionStorage.setItem(this.storageKey, JSON.stringify(tokenInfo));
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

    if (TokenManager.isTokenExpired(this.currentToken)) {
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
    const headers = this.executionContext.getHeaders();
    delete headers['Authorization'];
    this.executionContext.setHeaders(headers);
    
    // Remove from session storage if this is an OAuth token
    if (isBrowser && this.isOAuth) {
      try {
        sessionStorage.removeItem(this.storageKey);
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
    
    // Update authorization header
    this.executionContext.setHeaders({
      'Authorization': `Bearer ${tokenInfo.token}`
    });
  }
}
