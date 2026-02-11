import { UiPathConfig } from './config/config';
import { ExecutionContext } from './context/execution';
import { AuthService } from './auth/service';
import { UiPathSDKConfig, BaseConfig, hasOAuthConfig, hasSecretConfig } from './config/sdk-config';
import { validateConfig, normalizeBaseUrl } from './config/config-utils';
import { telemetryClient, trackEvent } from './telemetry';
import { SDKInternalsRegistry } from './internals';
import type { IUiPath } from './types';
import type { TokenClaims, TokenIdentity } from './auth/types';

/**
 * UiPath - Core SDK class for authentication and configuration management.
 *
 * Handles authentication, configuration, and provides access to SDK internals
 * for service instantiation in the modular pattern.
 *
 * @example
 * ```typescript
 * // Modular pattern
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   clientId: 'xxx',
 *   redirectUri: 'http://localhost:3000/callback',
 *   scope: 'OR.Users OR.Robots'
 * });
 *
 * await sdk.initialize();
 *
 * const entitiesService = new Entities(sdk);
 * const allEntities = await entitiesService.getAll();
 * ```
 */
export class UiPath implements IUiPath {
  // Private fields - true runtime privacy, not visible via Object.keys()
  #config: UiPathConfig;
  #authService: AuthService;
  #initialized: boolean = false;

  /** Read-only config for user convenience */
  public readonly config: Readonly<BaseConfig>;

  constructor(config: UiPathSDKConfig) {
    // Validate and normalize the configuration
    validateConfig(config);

    const hasSecretAuth = hasSecretConfig(config);
    const hasOAuthAuth = hasOAuthConfig(config);

    // Initialize core components
    const internalConfig = new UiPathConfig({
      baseUrl: normalizeBaseUrl(config.baseUrl),
      orgName: config.orgName,
      tenantName: config.tenantName,
      secret: hasSecretAuth ? config.secret : undefined,
      clientId: hasOAuthAuth ? config.clientId : undefined,
      redirectUri: hasOAuthAuth ? config.redirectUri : undefined,
      scope: hasOAuthAuth ? config.scope : undefined
    });

    const executionContext = new ExecutionContext();
    this.#authService = new AuthService(internalConfig, executionContext);
    this.#config = internalConfig;

    // Store internals in SDKInternalsRegistry (not visible on instance)
    SDKInternalsRegistry.set(this, {
      config: internalConfig,
      context: executionContext,
      tokenManager: this.#authService.getTokenManager()
    });

    // Expose read-only config for user convenience
    this.config = {
      baseUrl: internalConfig.baseUrl,
      orgName: internalConfig.orgName,
      tenantName: internalConfig.tenantName
    };

    // Initialize telemetry with SDK configuration
    telemetryClient.initialize({
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName,
      clientId: hasOAuthAuth ? config.clientId : undefined,
      redirectUri: hasOAuthAuth ? config.redirectUri : undefined
    });

    // Track SDK initialization
    trackEvent('Sdk.Auth');

    // Auto-initialize for secret-based auth
    if (hasSecretAuth) {
      this.#authService.authenticateWithSecret(config.secret);
      this.#initialized = true;
    }
  }

  /**
   * Initialize the SDK based on the provided configuration.
   * This method handles both OAuth flow initiation and completion automatically.
   * For secret-based authentication, initialization is automatic and this returns immediately.
   */
  public async initialize(): Promise<void> {
    // For secret-based auth, it's already initialized in constructor
    if (hasSecretConfig(this.#config)) {
      return;
    }

    try {
      // Check for OAuth callback first
      if (AuthService.isInOAuthCallback()) {
        if (await this.completeOAuth()) {
          return;
        }
      }

      // Check if already authenticated
      if (this.isAuthenticated()) {
        this.#initialized = true;
        return;
      }

      // Start new OAuth flow
      await this.#authService.authenticate(this.#config);

      if (this.isAuthenticated()) {
        this.#initialized = true;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`Failed to initialize UiPath SDK: ${errorMessage}`);
    }
  }

  /**
   * Check if the SDK has been initialized
   */
  public isInitialized(): boolean {
    return this.#initialized;
  }

  /**
   * Check if we're in an OAuth callback state
   */
  public isInOAuthCallback(): boolean {
    return AuthService.isInOAuthCallback();
  }

  /**
   * Complete OAuth authentication flow (only call if isInOAuthCallback() is true)
   */
  public async completeOAuth(): Promise<boolean> {
    if (!AuthService.isInOAuthCallback()) {
      throw new Error('Not in OAuth callback state. Call initialize() first to start OAuth flow.');
    }

    try {
      const success = await this.#authService.authenticate(this.#config);
      if (success && this.isAuthenticated()) {
        this.#initialized = true;
        return true;
      }
      return false;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      throw new Error(`Failed to complete OAuth: ${errorMessage}`);
    }
  }

  /**
   * Check if the user is authenticated (has valid token)
   */
  public isAuthenticated(): boolean {
    return this.#authService.hasValidToken();
  }

  /**
   * Get the current authentication token
   */
  public getToken(): string | undefined {
    return this.#authService.getToken();
  }

  /**
   * Get decoded claims from the current JWT token.
   * Returns undefined if token is missing or malformed.
   */
  public getTokenClaims(): TokenClaims | undefined {
    const token = this.getToken();
    if (!token) {
      return undefined;
    }

    return this.decodeJwtClaims(token);
  }

  /**
   * Get normalized identity from token claims.
   * Returns undefined if token is missing or malformed.
   */
  public getTokenIdentity(): TokenIdentity | undefined {
    const claims = this.getTokenClaims();
    if (!claims) {
      return undefined;
    }

    return {
      userId: this.getFirstStringClaim(claims, ['sub', 'user_id', 'uid']),
      username: this.getFirstStringClaim(claims, ['preferred_username', 'upn', 'unique_name']),
      email: this.getFirstStringClaim(claims, ['email']),
      name: this.getFirstStringClaim(claims, ['name']),
      givenName: this.getFirstStringClaim(claims, ['given_name']),
      familyName: this.getFirstStringClaim(claims, ['family_name']),
      tenantName: this.getFirstStringClaim(claims, ['tenantName', 'tenant']),
      orgName: this.getFirstStringClaim(claims, ['orgName', 'org']),
      rawClaims: claims
    };
  }

  private decodeJwtClaims(token: string): TokenClaims | undefined {
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      return undefined;
    }

    try {
      const payload = this.base64UrlDecode(parts[1]);
      const parsed = JSON.parse(payload);

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return undefined;
      }

      return parsed as TokenClaims;
    } catch {
      return undefined;
    }
  }

  private base64UrlDecode(value: string): string {
    const base64 = value
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');

    if (typeof atob === 'function') {
      try {
        return decodeURIComponent(
          Array.from(atob(base64))
            .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
            .join('')
        );
      } catch {
        return atob(base64);
      }
    }

    if (typeof Buffer !== 'undefined') {
      return Buffer.from(base64, 'base64').toString('utf-8');
    }

    throw new Error('No base64 decoder available');
  }

  private getFirstStringClaim(claims: TokenClaims, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = claims[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }

    return undefined;
  }

}
