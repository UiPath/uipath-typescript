import { BaseService } from '../../services/baseService';
import { Config } from '../config/config';
import { ExecutionContext } from '../context/executionContext';
import { TokenManager, TokenInfo } from './tokenManager';
import { hasOAuthConfig, hasSecretConfig } from '../config/sdkConfig';
import { isBrowser } from '../../utils/platform';

export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export class AuthService extends BaseService {
  private tokenManager: TokenManager;

  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
    
    // Determine if this is OAuth-based authentication
    const isOAuth = hasOAuthConfig(config);
    
    // Create TokenManager with client ID from config or a default identifier
    const clientId = isOAuth ? config.clientId : 
                     hasSecretConfig(config) ? `secret-${config.orgName}-${config.tenantName}` : 
                     `unknown-${Date.now()}`;
                     
    try {
      this.tokenManager = new TokenManager(executionContext, clientId, isOAuth);
    } catch (error) {
      throw new Error(`Failed to create TokenManager: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticates the user based on the provided SDK configuration.
   * This method handles both secret-based and OAuth 2.0 authentication flows.
   * @param config The SDK configuration object.
   * @returns A promise that resolves to true if authentication is successful, otherwise false.
   * In an OAuth flow, this method will trigger a page redirect and the promise will not resolve.
   */
  public async authenticate(config: Config): Promise<boolean> {
    // Try to load token from storage first (only works for OAuth tokens)
    const loadedFromStorage = this.tokenManager.loadFromStorage();
    
    // If we have a valid token from storage, return true
    if (loadedFromStorage && this.tokenManager.hasValidToken()) {
      return true;
    }
    
    // If we don't have a valid token from storage, authenticate based on config
    if (hasOAuthConfig(config)) {
      return await this.authenticateWithOAuth(config.clientId, config.redirectUri);
    } else if (hasSecretConfig(config)) {
      return await this.authenticateWithSecret(config.secret);
    }

    return false;
  }
  

  /**
   * Authenticate using OAuth flow
   */
  private async authenticateWithOAuth(clientId: string, redirectUri: string): Promise<boolean> {
    if (!isBrowser) {
      throw new Error('OAuth flow is only supported in browser environments');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (!code) {
      // No authorization code present, so we need to initiate the flow.
      // This will redirect the user.
      await this._initiateOAuthFlow(clientId, redirectUri);
      // This line is not expected to be reached.
      return false;
    } else {
      // Authorization code is present, so we can exchange it for a token.
      await this._handleOAuthCallback(code, clientId, redirectUri);
      return this.hasValidToken();
    }
  }

  /**
   * Authenticate using API secret
   */
  private async authenticateWithSecret(secret: string): Promise<boolean> {
    try {
      this.updateToken(secret, 'secret');
      return true;
    } catch (error) {
      console.error('Failed to authenticate with secret', error);
      return false;
    }
  }

  /**
   * Updates the access token used for API requests
   * @param token The new access token
   * @param type The type of token (secret or oauth)
   * @param expiresIn Optional expiration time in seconds
   */
  updateToken(token: string, type: 'secret' | 'oauth', expiresIn?: number): void {
    const tokenInfo: TokenInfo = {
      token,
      type,
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined
    };
    this.tokenManager.setToken(tokenInfo);
  }
  public hasValidToken(): boolean {
    return this.tokenManager.hasValidToken();
  }

  /**
   * Get the current token
   */
  public getToken(): string | undefined {
    if (!this.tokenManager.hasValidToken()) {
      return undefined;
    }
    return this.tokenManager.getToken();
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
      scope: params.scope || 'PIMS',
      state: params.state || this.generateCodeVerifier().slice(0, 16)
    });

    return `${this.config.baseUrl}/${orgName}/identity_/connect/authorize?${queryParams.toString()}`;
  }

  /**
   * Exchanges the authorization code for an access token and automatically updates the current token
   */
  private async getAccessToken(params: {
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
    this.updateToken(token.access_token, 'oauth', token.expires_in);
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

  private async _initiateOAuthFlow(clientId: string, redirectUri: string): Promise<void> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    sessionStorage.setItem('uipath_sdk_code_verifier', codeVerifier);

    const authUrl = this.getAuthorizationUrl({
      clientId,
      redirectUri,
      codeChallenge
    });
    
    window.location.href = authUrl;
  }

  private async _handleOAuthCallback(code: string, clientId: string, redirectUri: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem('uipath_sdk_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found in session storage. Authentication may have been interrupted.');
    }
    sessionStorage.removeItem('uipath_sdk_code_verifier');

    await this.getAccessToken({
      clientId,
      redirectUri,
      code,
      codeVerifier
    });

    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
  }
} 