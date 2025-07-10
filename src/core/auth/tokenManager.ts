import { ExecutionContext } from '../context/executionContext';

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

  constructor(private executionContext: ExecutionContext) {}

  /**
   * Sets a new token and updates all necessary contexts
   */
  setToken(tokenInfo: TokenInfo): void {
    this.currentToken = tokenInfo;
    
    // Store token in execution context
    this.executionContext.set('tokenInfo', tokenInfo);
    
    // Update authorization header
    this.executionContext.setHeaders({
      'Authorization': `Bearer ${tokenInfo.token}`
    });
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
  }
}
