import { ExecutionContext } from '../context/executionContext';
import { isBrowser } from '../../utils/platform';

export interface TokenInfo {
  token: string;
  type: 'secret' | 'oauth';
  expiresAt?: Date;
}

/**
 * TokenManager is responsible for managing authentication tokens.
 * It provides a single source of truth for token operations.
 */
export class TokenManager {
  private currentToken?: TokenInfo;
  private readonly STORAGE_KEY = 'uipath_sdk_token';
  private static instance: TokenManager | null = null;
  
  /**
   * Creates a new TokenManager instance or returns the existing one
   * @param executionContext The execution context
   */
  public static getInstance(executionContext: ExecutionContext): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager(executionContext);
    }
    return TokenManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor(private executionContext: ExecutionContext) {}
  
  /**
   * Loads token from session storage if available
   * @returns true if a valid token was loaded, false otherwise
   */
  public loadFromStorage(): boolean {
    if (!isBrowser) {
      return false;
    }
    
    try {
      const storedToken = sessionStorage.getItem(this.STORAGE_KEY);
      if (!storedToken) {
        return false;
      }
      
      const tokenInfo = this._parseTokenInfo(storedToken);
      if (!tokenInfo) {
        // Invalid token format, clear it
        sessionStorage.removeItem(this.STORAGE_KEY);
        return false;
      }
      
      // Check if token is expired
      if (tokenInfo.expiresAt && new Date() >= tokenInfo.expiresAt) {
        // Token expired, clear it
        sessionStorage.removeItem(this.STORAGE_KEY);
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
    
    // Store in session storage if in browser
    if (isBrowser) {
      try {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokenInfo));
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

    if (this.currentToken.expiresAt && new Date() > this.currentToken.expiresAt) {
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
    
    // Remove from session storage
    if (isBrowser) {
      try {
        sessionStorage.removeItem(this.STORAGE_KEY);
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
