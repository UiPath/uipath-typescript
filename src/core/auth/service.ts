import { BaseService } from '../../services/base';
import { Config } from '../config/config';
import { ExecutionContext } from '../context/execution';
import { TokenManager } from './token-manager';
import { AuthToken, TokenInfo, OAuthContext } from './types';
import { hasOAuthConfig } from '../config/sdk-config';
import { isBrowser } from '../../utils/platform';
import { IDENTITY_ENDPOINTS } from '../../utils/constants/endpoints';
import { TaskEventsService, TaskEventsServicePublic, TaskEventsServiceInternal } from '../../services';
import { jwtDecode, JwtPayload } from 'jwt-decode';

export class AuthService extends BaseService {
  private tokenManager: TokenManager;
  private taskEventsService: TaskEventsServiceInternal;

  constructor(config: Config, executionContext: ExecutionContext) {
    // Check if we should use stored OAuth context instead of provided config
    const storedContext = AuthService.getStoredOAuthContext();
    const effectiveConfig = storedContext ? AuthService._mergeConfigWithContext(config, storedContext) : config;

    const isOAuth = hasOAuthConfig(effectiveConfig);
    const taskEventsService = new TaskEventsService();
    const tokenManager = new TokenManager(executionContext, effectiveConfig, isOAuth, taskEventsService);
    taskEventsService.setTokenManager(tokenManager);
    super(effectiveConfig, executionContext, tokenManager);
    this.tokenManager = tokenManager;
    this.taskEventsService = taskEventsService;

    // Auto-load token from storage on initialization
    // This ensures isAuthenticated() returns true after page refresh if a valid token exists
    this.tokenManager.loadFromStorage();
  }

  /**
   * Check if we're in an OAuth callback state
   */
  public static isInOAuthCallback(): boolean {
    if (!isBrowser) return false;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hasCodeVerifier = sessionStorage.getItem('uipath_sdk_code_verifier');
    
    return !!(code && hasCodeVerifier);
  }

  /**
   * Get stored OAuth context
   */
  public static getStoredOAuthContext(): OAuthContext | null {
    if (!isBrowser) {
      return null;
    }
    
    try {
      const stored = sessionStorage.getItem('uipath_sdk_oauth_context');
      if (!stored) {
        return null;
      }
      
      const context = JSON.parse(stored) as OAuthContext;
      
      // Validate required fields
      if (!context.codeVerifier || !context.clientId || !context.redirectUri || 
          !context.baseUrl || !context.orgName) {
        sessionStorage.removeItem('uipath_sdk_oauth_context');
        return null;
      }
      
      return context;
    } catch (error) {
      sessionStorage.removeItem('uipath_sdk_oauth_context');
      console.warn('Failed to parse stored OAuth context from session storage', error);
      return null;
    }
  }

  /**
   * Merges provided config with stored OAuth context, prioritizing stored values
   */
  private static _mergeConfigWithContext(config: Config, context: OAuthContext): Config {
    return {
      ...config,
      baseUrl: context.baseUrl,
      orgName: context.orgName,
      tenantName: context.tenantName,
      clientId: context.clientId,
      redirectUri: context.redirectUri,
      scope: context.scope
    };
  }

  /**
   * Get the token manager instance
   */
  public getTokenManager(): TokenManager {
    return this.tokenManager;
  }

  /**
   * Get the task events public service instance
   */
  public getTaskEventsService(): TaskEventsServicePublic {
    return this.taskEventsService;
  }

  /**
   * Authenticates the user based on the provided SDK configuration.
   * This method handles OAuth 2.0 authentication flow only.
   * For secret-based authentication, see authenticateWithSecret().
   * @param config The SDK configuration object.
   * @returns A promise that resolves to true if authentication is successful, otherwise false.
   * In an OAuth flow, this method will trigger a page redirect and the promise will not resolve.
   */
  public async authenticate(config: Config): Promise<boolean> {
    if (!isBrowser) {
      return false;
    }
    
    // First priority: Complete OAuth callback if we detect it
    if (AuthService.isInOAuthCallback()) {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (!code) {
        throw new Error('Authorization code missing in OAuth callback');
      }
      // Check if token already exists (prevents duplicate processing)
      if (this.tokenManager.hasValidToken()) {
        return true;
      }
      
      // Ensure we have OAuth config for callback completion
      if (!hasOAuthConfig(config)) {
        throw new Error('OAuth configuration incomplete: clientId, redirectUri, and scope are required for OAuth callback');
      }
      
      const result = await this._authenticateWithOAuth(config.clientId, config.redirectUri, config.scope);
      return result;
    }
    
    // Secondly: Try to load existing valid token from storage
    const loadedFromStorage = this.tokenManager.loadFromStorage();
    
    // If we have a valid token from storage, return true
    if (loadedFromStorage && this.tokenManager.hasValidToken()) {
      return true;
    }
    
    // Start new OAuth flow if config has OAuth fields
    if (hasOAuthConfig(config)) {
      return await this._authenticateWithOAuth(config.clientId, config.redirectUri, config.scope);
    }

    return false;
  }
  

  /**
   * Authenticate using OAuth flow
   */
  private async _authenticateWithOAuth(clientId: string, redirectUri: string, scope: string): Promise<boolean> {
    if (!isBrowser) {
      throw new Error('OAuth flow is only supported in browser environments');
    }

    // Check if we have a stored code verifier indicating we're in an OAuth flow
    const codeVerifier = sessionStorage.getItem('uipath_sdk_code_verifier');
    const isInOAuthFlow = codeVerifier !== null;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    // If we're in an OAuth flow (server-controlled code verifier exists), handle the callback
    if (isInOAuthFlow) {
      // We're expecting a callback - validate parameters
      if (!code) {
        // Clear stored state on error
        sessionStorage.removeItem('uipath_sdk_code_verifier');
        throw new Error('Authorization code missing in OAuth callback');
      }
      
      // Validate the authorization code format before using it
      // OAuth authorization codes should be alphanumeric with some special characters
      const codePattern = /^[A-Za-z0-9\-._~+/]+=*$/;
      if (!codePattern.test(code)) {
        // Clear stored state on error
        sessionStorage.removeItem('uipath_sdk_code_verifier');
        throw new Error('Invalid authorization code format');
      }
      
      // Authorization code is present and validated, so we can exchange it for a token.
      await this._handleOAuthCallback(code, clientId, redirectUri);
      return this.hasValidToken();
    } else {
      // Not in an OAuth flow - initiate one
      // Ignore any URL parameters that might be present
      await this._initiateOAuthFlow(clientId, redirectUri, scope);
      // This line is not expected to be reached due to redirect
      return false;
    }
  }

  /**
   * Authenticate using API secret
   */
  public authenticateWithSecret(secret: string): boolean {
    try {
      const expiryTime = this._extractExpiryTime(secret);
      this.updateToken({ token: secret, type: 'secret', expiresAt: expiryTime});
      return true;
    } catch (error) {
      console.error('Failed to authenticate with secret', error);
      return false;
    }
  }

  /**
   * Updates the access token used for API requests
   * @param tokenInfo The token information containing the access token, type, expiration, and refresh token
   */
  updateToken(tokenInfo: TokenInfo): void {
    this.tokenManager.setToken(tokenInfo);
  }

  /**
   * Checks if the current token is valid
   */
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
      try {
      const crypto = require('crypto');
      return crypto.randomBytes(32)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      } catch(e) {
        throw new Error("crypto not available in browser")
      }
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
      try {
      const crypto = require('crypto');
      return crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      } catch (e) {
        throw new Error("crypto not available in browser")
      }
    }
  }

  /**
   * Gets the authorization URL for the OAuth flow
   */
  getAuthorizationUrl(params: {
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    scope: string;
    state?: string;
  }): string {
    const orgName = this.config.orgName;
    
    const queryParams = new URLSearchParams({
      response_type: 'code',
      client_id: params.clientId,
      redirect_uri: params.redirectUri,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      scope: params.scope + ' offline_access',
      state: params.state || this.generateCodeVerifier().slice(0, 16)
    });

    return `${this.config.baseUrl}/${orgName}/${IDENTITY_ENDPOINTS.AUTHORIZE}?${queryParams.toString()}`;
  }

  /**
   * Exchanges the authorization code for an access token and automatically updates the current token
   */
  private async _getAccessToken(params: {
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

    const response = await fetch(`${this.config.baseUrl}/${orgName}/${IDENTITY_ENDPOINTS.TOKEN}`, {
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
    this.updateToken({
      token: token.access_token,
      type: 'oauth',
      expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : undefined,
      refreshToken: token.refresh_token
    });

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

  private async _initiateOAuthFlow(clientId: string, redirectUri: string, scope: string): Promise<void> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store complete OAuth context for callback completion
    const oauthContext: OAuthContext = {
      codeVerifier,
      clientId,
      redirectUri,
      baseUrl: this.config.baseUrl,
      orgName: this.config.orgName,
      tenantName: this.config.tenantName,
      scope
    };
    
    sessionStorage.setItem('uipath_sdk_oauth_context', JSON.stringify(oauthContext));
    sessionStorage.setItem('uipath_sdk_code_verifier', codeVerifier);

    const authUrl = this.getAuthorizationUrl({
      clientId,
      redirectUri,
      codeChallenge,
      scope
    });

    const popupWindow = window.open(authUrl, 'OAuthWindow', 'height=500,width=500');
    
    popupWindow!.location.href = authUrl;
  }

  private async _handleOAuthCallback(code: string, clientId: string, redirectUri: string): Promise<void> {
    const codeVerifier = sessionStorage.getItem('uipath_sdk_code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found in session storage. Authentication may have been interrupted.');
    }

    await this._getAccessToken({
      clientId,
      redirectUri,
      code,
      codeVerifier
    });

    // Clear OAuth context and code verifier after successful token exchange
    sessionStorage.removeItem('uipath_sdk_oauth_context');
    sessionStorage.removeItem('uipath_sdk_code_verifier');

    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    window.history.replaceState({}, '', url.toString());
  }

  private _extractExpiryTime(secret: string): Date | undefined {
    try {
      const decodedToken = jwtDecode<JwtPayload>(secret);
      if (decodedToken.exp) {
        return new Date(decodedToken.exp * 1000);
      }
    }
    catch (_) {}
  }
} 