import { UiPathConfig } from './config/config';
import { ExecutionContext } from './context/execution';
import { AuthService } from './auth/service';
import { TokenManager } from './auth/token-manager';
import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from './config/sdk-config';
import { validateConfig, normalizeBaseUrl } from './config/config-utils';
import { telemetryClient, trackEvent } from './telemetry';

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
 * const uiPath = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   clientId: 'xxx',
 *   redirectUri: 'http://localhost:3000/callback'
 * });
 *
 * await uiPath.initialize();
 *
 * const entitiesService = new Entities(uiPath);
 * const allEntities = await entitiesService.getAll();
 * ```
 */
export class UiPath {
  private config: UiPathConfig;
  private executionContext: ExecutionContext;
  private authService: AuthService;
  private initialized: boolean = false;

  constructor(config: UiPathSDKConfig) {
    // Validate and normalize the configuration
    validateConfig(config);

    const hasSecretAuth = hasSecretConfig(config);
    const hasOAuthAuth = hasOAuthConfig(config);

    // Initialize core components
    this.config = new UiPathConfig({
      baseUrl: normalizeBaseUrl(config.baseUrl),
      orgName: config.orgName,
      tenantName: config.tenantName,
      secret: hasSecretAuth ? config.secret : undefined,
      clientId: hasOAuthAuth ? config.clientId : undefined,
      redirectUri: hasOAuthAuth ? config.redirectUri : undefined,
      scope: hasOAuthAuth ? config.scope : undefined
    });

    this.executionContext = new ExecutionContext();
    this.authService = new AuthService(this.config, this.executionContext);

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
      this.authService.authenticateWithSecret(config.secret);
      this.initialized = true;
    }
  }

  /**
   * Initialize the SDK based on the provided configuration.
   * This method handles both OAuth flow initiation and completion automatically.
   * For secret-based authentication, initialization is automatic and this returns immediately.
   */
  public async initialize(): Promise<void> {
    // For secret-based auth, it's already initialized in constructor
    if (hasSecretConfig(this.config)) {
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
        this.initialized = true;
        return;
      }

      // Start new OAuth flow
      await this.authService.authenticate(this.config);

      if (this.isAuthenticated()) {
        this.initialized = true;
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
    return this.initialized;
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
      const success = await this.authService.authenticate(this.config);
      if (success && this.isAuthenticated()) {
        this.initialized = true;
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
    return this.authService.hasValidToken();
  }

  /**
   * Get the current authentication token
   */
  public getToken(): string | undefined {
    return this.authService.getToken();
  }

  /**
   * Get the SDK configuration object.
   *
   * Returns the configuration containing base URL, organization name, tenant name,
   * and authentication settings. This method is used internally by services via
   * dependency injection to access SDK configuration.
   *
   * @returns The UiPath configuration containing baseUrl, orgName, tenantName, and auth settings
   *
   * @remarks
   * In the modular pattern, services access this via dependency injection through BaseService.
   * Most users won't need to call this directly unless accessing configuration details.
   *
   * @example
   * ```typescript
   * const uiPath = new UiPath(config);
   * const currentConfig = uiPath.getConfig();
   * console.log(`Connected to: ${currentConfig.baseUrl}`);
   * console.log(`Organization: ${currentConfig.orgName}`);
   * console.log(`Tenant: ${currentConfig.tenantName}`);
   * ```
   */
  public getConfig(): UiPathConfig {
    return this.config;
  }

  /**
   * Get the execution context for request tracking and metadata.
   *
   * Returns the execution context used internally by services to track request lifecycle
   * and add contextual information to API calls. This method is used by services via
   * dependency injection.
   *
   * @returns The execution context providing request tracking and metadata capabilities
   *
   * @remarks
   * In the modular pattern, services receive this via dependency injection through BaseService.
   * This is primarily used internally by the API client. Most users won't need to call this directly.
   */
  public getContext(): ExecutionContext {
    return this.executionContext;
  }

  /**
   * Get the token manager for authentication token operations.
   *
   * Returns the token manager that handles OAuth and secret-based authentication tokens.
   * This method is used internally by services via dependency injection to create
   * authenticated API clients.
   *
   * @returns The token manager handling authentication tokens (OAuth or secret-based)
   *
   * @remarks
   * In the modular pattern, services receive this via dependency injection through BaseService.
   * The token manager is used by the API client to add authentication headers to requests.
   * Most users won't need to call this directly unless implementing custom authentication logic.
   *
   * @example
   * ```typescript
   * // Advanced usage - custom authentication logic
   * const uiPath = new UiPath(config);
   * await uiPath.initialize();
   * const tokenManager = uiPath.getTokenManager();
   * const currentToken = tokenManager.getToken();
   * ```
   */
  public getTokenManager(): TokenManager {
    return this.authService.getTokenManager();
  }
}
