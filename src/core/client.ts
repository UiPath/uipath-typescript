import { UiPathConfig } from './config/config';
import { ExecutionContext } from './context/execution';
import { AuthService } from './auth/service';
import { TokenManager } from './auth/token-manager';
import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from './config/sdk-config';
import { validateConfig, normalizeBaseUrl } from './config/config-utils';
import { telemetryClient, trackEvent } from './telemetry';

/**
 * Type for service constructors that can be instantiated via .get()
 */
export interface ServiceConstructor<T> {
  new (config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager): T;
}

/**
 * UiPath Client - Core client for authentication and configuration management.
 *
 * Handles authentication, configuration, and service instance management.
 * Use `UiPathClient.connect()` to create authenticated instances.
 */
export class UiPathClient {
  private config: UiPathConfig;
  private executionContext: ExecutionContext;
  private authService: AuthService;
  private initialized: boolean = false;
  private serviceRegistry: Map<ServiceConstructor<any>, any> = new Map();

  constructor(config: UiPathSDKConfig) {
    // Validate and normalize the configuration
    validateConfig(config);

    // Initialize core components
    this.config = new UiPathConfig({
      baseUrl: normalizeBaseUrl(config.baseUrl),
      orgName: config.orgName,
      tenantName: config.tenantName,
      secret: hasSecretConfig(config) ? config.secret : undefined,
      clientId: hasOAuthConfig(config) ? config.clientId : undefined,
      redirectUri: hasOAuthConfig(config) ? config.redirectUri : undefined,
      scope: hasOAuthConfig(config) ? config.scope : undefined
    });

    this.executionContext = new ExecutionContext();
    this.authService = new AuthService(this.config, this.executionContext);

    // Initialize telemetry with SDK configuration
    telemetryClient.initialize({
      baseUrl: config.baseUrl,
      orgName: config.orgName,
      tenantName: config.tenantName,
      clientId: hasOAuthConfig(config) ? config.clientId : undefined,
      redirectUri: hasOAuthConfig(config) ? config.redirectUri : undefined
    });

    // Track SDK initialization
    trackEvent('Sdk.Auth');

    // Auto-initialize for secret-based auth
    if (hasSecretConfig(config)) {
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
   * Get the UiPath configuration
   */
  public getConfig(): UiPathConfig {
    return this.config;
  }

  /**
   * Get the execution context
   */
  public getContext(): ExecutionContext {
    return this.executionContext;
  }

  /**
   * Get the token manager
   */
  public getTokenManager(): TokenManager {
    return this.authService.getTokenManager();
  }

  /**
   * Get a service instance. Services are cached per client instance.
   *
   * @param ServiceClass - The service class constructor
   * @returns Cached or newly created service instance
   */
  public get<T>(ServiceClass: ServiceConstructor<T>): T {
    // Check if service instance already exists in registry
    if (!this.serviceRegistry.has(ServiceClass)) {
      // Create new instance and cache it - uses same pattern as legacy UiPath class
      const instance = new ServiceClass(
        this.getConfig(),
        this.getContext(),
        this.getTokenManager()
      );
      this.serviceRegistry.set(ServiceClass, instance);
    }

    return this.serviceRegistry.get(ServiceClass)!;
  }

  /**
   * Static method to connect to UiPath and initialize authentication.
   * This is the recommended way to create a UiPathClient instance.
   *
   * @param config - SDK configuration
   * @returns Promise resolving to authenticated UiPath client instance
   *
   * @example
   * ```typescript
   * // Secret auth (Node.js)
   * const uipath = await UiPath.connect({
   *   baseUrl: 'https://cloud.uipath.com',
   *   orgName: 'myorg',
   *   tenantName: 'mytenant',
   *   secret: process.env.UIPATH_SECRET
   * });
   *
   * // OAuth (Browser)
   * const uipath = await UiPath.connect({
   *   baseUrl: 'https://cloud.uipath.com',
   *   orgName: 'myorg',
   *   tenantName: 'mytenant',
   *   clientId: 'xxx',
   *   redirectUri: 'http://localhost:3000/callback',
   *   scope: 'OR.Execution'
   * });
   *
   * // Get services
   * const entities = uipath.get(Entities);
   * const tasks = uipath.get(Tasks);
   * ```
   */
  public static async connect(config: UiPathSDKConfig): Promise<UiPathClient> {
    const client = new UiPathClient(config);
    await client.initialize();
    return client;
  }
}
