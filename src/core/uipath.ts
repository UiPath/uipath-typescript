import { UiPathConfig } from './config/config';
import { ExecutionContext } from './context/execution';
import { AuthService } from './auth/service';
import { UiPathSDKConfig, PartialUiPathConfig, BaseConfig, hasOAuthConfig, hasSecretConfig } from './config/sdk-config';
import { validateConfig, normalizeBaseUrl, isCompleteConfig } from './config/config-utils';
import { telemetryClient, trackEvent } from './telemetry';
import { SDKInternalsRegistry } from './internals';
import { loadFromMetaTags } from './config/runtime';
import type { IUiPath } from './types';

/**
 * UiPath - Core SDK class for authentication and configuration management.
 *
 * Handles authentication, configuration, and provides access to SDK internals
 * for service instantiation in the modular pattern.
 *
 * Supports two usage patterns:
 * 1. Full config in constructor — for server-side or explicit configuration
 * 2. No config / partial config — loads from meta tags injected by @uipath/coded-apps plugin
 *
 * @example
 * ```typescript
 * // Explicit config
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: 'myorg',
 *   tenantName: 'mytenant',
 *   clientId: 'xxx',
 *   redirectUri: 'http://localhost:3000/callback',
 *   scope: 'OR.Users OR.Robots'
 * });
 * await sdk.initialize();
 * ```
 *
 * @example
 * ```typescript
 * // Auto-load from meta tags (coded apps)
 * const sdk = new UiPath();
 * await sdk.initialize();
 * ```
 */
export class UiPath implements IUiPath {
  // Private fields - true runtime privacy, not visible via Object.keys()
  #config?: UiPathConfig;
  #authService?: AuthService;
  #initialized: boolean = false;
  #partialConfig?: PartialUiPathConfig;

  /** Read-only config for user convenience */
  public readonly config!: Readonly<BaseConfig>;

  constructor(config?: PartialUiPathConfig) {
    // Load configuration from meta tags
    const configFromMetaTags = loadFromMetaTags();

    // Merge configuration: constructor config overrides meta tags
    const mergedConfig = config ? { ...configFromMetaTags, ...config } : configFromMetaTags;

    if (mergedConfig && isCompleteConfig(mergedConfig)) {
      this.#initializeWithConfig(mergedConfig);
    } else if (config) {
      this.#partialConfig = config;
    }
  }

  #initializeWithConfig(config: UiPathSDKConfig): void {
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
    (this as any).config = {
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

  #loadConfig(): UiPathSDKConfig {
    // Load from meta tags
    const metaConfig = loadFromMetaTags();

    // Merge with any partial config from constructor (constructor overrides meta tags)
    const merged = { ...metaConfig, ...this.#partialConfig };

    if (!isCompleteConfig(merged)) {
      throw new Error(
        'UiPath SDK configuration not found. ' +
        'Ensure @uipath/coded-apps plugin is set up in your bundler to inject configuration during development and build.'
      );
    }

    return merged;
  }

  /**
   * Initialize the SDK based on the provided configuration.
   * This method handles both OAuth flow initiation and completion automatically.
   * For secret-based authentication, initialization is automatic and this returns immediately.
   * If no config was provided in constructor, loads from meta tags.
   */
  public async initialize(): Promise<void> {
    // Load config from meta tags if not provided in constructor
    if (!this.#config) {
      const loadedConfig = this.#loadConfig();
      this.#initializeWithConfig(loadedConfig);
    }

    // For secret-based auth, it's already initialized in constructor
    if (hasSecretConfig(this.#config!)) {
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
      await this.#authService!.authenticate(this.#config!);

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

    // Load config if not yet initialized
    if (!this.#config) {
      const loadedConfig = this.#loadConfig();
      this.#initializeWithConfig(loadedConfig);
    }

    try {
      const success = await this.#authService!.authenticate(this.#config!);
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
    return this.#authService?.hasValidToken() ?? false;
  }

  /**
   * Get the current authentication token
   */
  public getToken(): string | undefined {
    return this.#authService?.getToken();
  }

  /**
   * Logout from the SDK, clearing all authentication state.
   * After calling this method, the user will need to re-initialize to authenticate again.
   */
  public logout(): void {
    // Secret-based auth has no session to end — skip silently
    if (this.#config && hasSecretConfig(this.#config)) {
      return;
    }
    this.#authService?.logout();
    this.#initialized = false;
  }

}
