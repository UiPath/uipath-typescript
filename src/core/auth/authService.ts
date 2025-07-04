import { BaseService } from '../../services/baseService';
import { Config } from '../config/config';
import { ExecutionContext } from '../context/executionContext';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export class AuthService extends BaseService {
  private currentToken?: string;

  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Updates the access token used for API requests
   * @param token The new access token
   */
  updateToken(token: string): void {
    this.currentToken = token;
    // Update the execution context headers with the new token
    this.executionContext.setHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Gets the current access token
   * @returns The current access token or undefined if not set
   */
  getToken(): string | undefined {
    return this.currentToken;
  }

  /**
   * Generates a random code verifier for PKCE
   */
  generateCodeVerifier(): string {
    if (isBrowser) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return this._base64URLEncode(array);
    } else {
      // In Node.js environment
      const crypto = require('crypto');
      return crypto.randomBytes(32)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
  }

  /**
   * Generates a code challenge from the code verifier
   */
  async generateCodeChallenge(codeVerifier: string): Promise<string> {
    if (isBrowser) {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return this._base64URLEncode(new Uint8Array(hash));
    } else {
      // In Node.js environment
      const crypto = require('crypto');
      return crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
  }

  /**
   * Gets the authorization URL for the OAuth flow
   */
  getAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scope?: string;
    state?: string;
  }): string {
    const orgName = this.config.orgName;
    
    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      scope: params.scope || 'PIMS OR.default',
      state: params.state || this.generateCodeVerifier().slice(0, 16)
    });

    return `${this.config.baseUrl}/${orgName}/identity_/connect/authorize?${queryParams.toString()}`;
  }

  /**
   * Exchanges the authorization code for an access token and automatically updates the current token
   */
  async getAccessToken(params: {
    clientId: string;
    redirectUri: string;
    code: string;
    codeVerifier: string;
  }): Promise<AuthToken> {
    const orgName = this.config.orgName;
    
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: params.clientId,
      code: params.code,
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier
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
      console.error("OAuth error:", errorData);
      throw new Error(`Failed to get access token: ${JSON.stringify(errorData)}`);
    }

    const token = await response.json() as AuthToken;
    this.updateToken(token.access_token);
    return token;
  }

  /**
   * Base64URL encodes an array buffer
   */
  private _base64URLEncode(buffer: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...buffer));
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
} 