import { UiPathConfig } from './config/config';
import { ExecutionContext } from './context/execution';
import { AuthService } from './auth/service';
import { TokenInfo, LogoutOptions } from './auth/types';
import { UiPathSDKConfig, PartialUiPathConfig, BaseConfig, hasOAuthConfig, hasSecretConfig } from './config/sdk-config';
import { validateConfig, normalizeBaseUrl, isCompleteConfig, compactConfig, missingConfigMessage } from './config/config-utils';
import { telemetryClient, trackEvent } from './telemetry';
import { SDKInternalsRegistry } from './internals';
import { loadFromMetaTags } from './config/runtime';
import { loadFromEnvironment } from './config/environment';
import { configFromFunctionContext, isFunctionContext, type CodedFunctionContext } from './config/function-context';
import type { IUiPath } from './types';
import { isInActionCenter } from '../utils/platform';
import { trustedEmbeddingOrigin } from './auth/host-token-request';

/**
 * UiPath - Core SDK class for authentication and configuration management.
 *
 * Handles authentication, configuration, and provides access to SDK internals
 * for service instantiation in the modular pattern.
 *
 * Configuration is resolved from three sources, in precedence order:
 * 1. The constructor argument — either an explicit config or a coded function's
 *    `ctx`, which the SDK maps onto the config fields itself
 * 2. Meta tags injected by the @uipath/coded-apps-dev plugin — browser only
 * 3. The environment contract — `UIPATH_BASE_URL`, `UIPATH_ORG_NAME`,
 *    `UIPATH_TENANT_NAME`, `UIPATH_ACCESS_TOKEN` — outside the browser
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
 * // No arguments: meta tags in a coded app, the environment contract elsewhere
 * const sdk = new UiPath();
 * await sdk.initialize();
 * ```
 *
 * @example
 * ```typescript
 * // Coded function: pass the handler's context, ready to use straight away
 * import { defineFunction } from '@uipath/coded-functions-js-sdk';
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * export default defineFunction({
 *   name: 'list-entities',
 *   handler: async (_input, ctx) => {
 *     const sdk = new UiPath(ctx);
 *     const entities = await new Entities(sdk).getAll();
 *     return { count: entities.length };
 *   },
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Explicit ids and a bearer token — org and tenant accept either an id or a
 * // name, and `secret` takes any bearer token
 * const sdk = new UiPath({
 *   baseUrl: 'https://cloud.uipath.com',
 *   orgName: '<organizationId>',
 *   tenantName: '<tenantId>',
 *   secret: '<accessToken>'
 * });
 * ```
 */
export class UiPath implements IUiPath {
  // Private fields - true runtime privacy, not visible via Object.keys()
  #config?: UiPathConfig;
  #authService?: AuthService;
  #initialized: boolean = false;
  #partialConfig?: PartialUiPathConfig;
  // Folder key sourced only from `<meta name="uipath:folder-key">` (coded-app
  // deployments). Not accepted via the public constructor; lives here so the
  // SDK can flow it through to BaseService.config without polluting BaseConfig.
  #metaFolderKey?: string;
  // Org/tenant ids captured from the meta tags before the constructor config
  // is merged in. The `uipath:org-name`/`uipath:tenant-name` meta tags always
  // carry org/tenant *ids* in coded-app deployments, whereas a
  // constructor-supplied `orgName`/`tenantName` may be actual names — so the
  // telemetry ids must be read from the meta tags.
  #metaOrgId?: string;
  #metaTenantId?: string;

  /** Read-only config for user convenience */
  public readonly config!: Readonly<BaseConfig>;

  /**
   * Creates a UiPath SDK instance.
   *
   * @param config - Optional SDK configuration, or the execution context a coded function receives; when omitted, configuration is loaded from meta tags or the environment
   */
  constructor(config?: PartialUiPathConfig | CodedFunctionContext) {
    // A coded function passes its ctx here. A context with no coordinates (the
    // local case) resolves to undefined and falls through to the other sources.
    const resolved = config && isFunctionContext(config)
      ? configFromFunctionContext(config) ?? undefined
      : config;

    // Load configuration from meta tags
    const configFromMetaTags = loadFromMetaTags();
    this.#metaFolderKey = configFromMetaTags?.folderKey;
    this.#metaOrgId = configFromMetaTags?.orgName;
    this.#metaTenantId = configFromMetaTags?.tenantName;

    // Merge configuration: constructor config overrides meta tags, which
    // override the ambient execution-context environment contract.
    const mergedConfig = UiPath.#mergeConfigSources(configFromMetaTags, resolved);

    if (mergedConfig && isCompleteConfig(mergedConfig)) {
      this.#initializeWithConfig(mergedConfig);
    } else if (resolved) {
      this.#partialConfig = resolved;
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
      scope: hasOAuthAuth ? config.scope : undefined,
      enforceSso: config.enforceSso,
    });

    const executionContext = new ExecutionContext();
    this.#authService = new AuthService(internalConfig, executionContext);
    this.#config = internalConfig;

    // Store internals in SDKInternalsRegistry (not visible on instance).
    // `folderKey` is meta-tag-only — kept off `UiPathConfig` (which mirrors
    // user-passed values) and lives here on the runtime registry instead.
    SDKInternalsRegistry.set(this, {
      config: internalConfig,
      context: executionContext,
      tokenManager: this.#authService.getTokenManager(),
      folderKey: this.#metaFolderKey,
    });

    // Expose read-only config for user convenience
    (this as any).config = {
      baseUrl: internalConfig.baseUrl,
      orgName: internalConfig.orgName,
      tenantName: internalConfig.tenantName
    };

    // Initialize telemetry with SDK configuration.
    telemetryClient.initialize({
      baseUrl: config.baseUrl,
      orgId: this.#metaOrgId,
      tenantId: this.#metaTenantId,
      orgName: config.orgName,
      tenantName: config.tenantName,
      clientId: hasOAuthAuth ? config.clientId : undefined,
      redirectUri: hasOAuthAuth ? config.redirectUri : undefined
    });

    // Track SDK initialization
    trackEvent('Sdk.Auth');

    /** Auto-initialize for secret-based auth, Action Center, and generic host-embedded apps.
     * When viewed in Action Center or embedded in a UiPath host frame via the UIP protocol,
     * initialize tokenInfo with an empty token so getValidToken() can bootstrap via postMessage.
     * When an sdk call is made, the host passes the token to the sdk.
     */
    if (hasSecretAuth || isInActionCenter || trustedEmbeddingOrigin) {
      this.#authService.authenticateWithSecret(config.secret ?? '');
      this.#initialized = true;
    }
  }

  /**
   * Merge every configuration source in precedence order: constructor config,
   * then meta tags, then the environment contract.
   *
   * Each layer is compacted before merging so a sparse layer never blanks out
   * values from the layer beneath it.
   */
  static #mergeConfigSources(
    metaConfig?: PartialUiPathConfig | null,
    config?: PartialUiPathConfig | null,
  ): PartialUiPathConfig | undefined {
    const layers = [loadFromEnvironment(), metaConfig, config]
      .filter((layer): layer is PartialUiPathConfig => Boolean(layer))
      .map((layer) => compactConfig(layer));

    if (layers.length === 0) return undefined;

    const merged = layers.reduce<PartialUiPathConfig>((acc, layer) => ({ ...acc, ...layer }), {});

    // Auth is `secret` or OAuth, never both, and merging can end up with both.
    // Whichever the caller named here wins; the other's fields are dropped.
    // A caller naming both is contradicting themselves: left intact for validateConfig() to reject.
    const namesSecret = config ? hasSecretConfig(config) : false;
    // Any OAuth field, not all three: a half-filled OAuth config should error,
    // not quietly fall back to a `secret` from a lower layer.
    const namesOAuth = Boolean(config?.clientId || config?.redirectUri || config?.scope);

    if (namesSecret !== namesOAuth) {
      if (namesSecret) {
        delete merged.clientId;
        delete merged.redirectUri;
        delete merged.scope;
      } else {
        delete merged.secret;
      }
    }

    return merged;
  }

  #loadConfig(): UiPathSDKConfig {
    // Re-reads every source rather than reusing the constructor's merge: meta
    // tags can be injected after construction, and recovering that is why this
    // runs at all.
    const metaConfig = loadFromMetaTags();
    this.#metaFolderKey = metaConfig?.folderKey;
    this.#metaOrgId = metaConfig?.orgName;
    this.#metaTenantId = metaConfig?.tenantName;

    // Constructor config overrides meta tags, which override the environment.
    const merged = UiPath.#mergeConfigSources(metaConfig, this.#partialConfig);

    if (!merged || !isCompleteConfig(merged)) {
      throw new Error(missingConfigMessage());
    }

    return merged;
  }

  /**
   * Initialize the SDK based on the provided configuration.
   * This method handles both OAuth flow initiation and completion automatically.
   * For secret-based authentication, initialization is automatic and this returns immediately.
   * If no config was provided in constructor, loads from meta tags in the browser,
   * or from the execution-context environment contract outside it.
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
   * Releases resources held by this SDK instance.
   * Cancels any in-flight token-refresh request. Call this when the coded app is unmounted.
   */
  public destroy(): void {
    this.#authService?.getTokenManager()?.destroy();
  }

  /**
   * By default only local state is cleared — the UiPath session (Automation
   * Cloud or Automation Suite) stays active, so the next sign-in completes
   * silently. Pass `endSession: true` (browser-only) to also sign the user
   * out of the UiPath session: the browser is redirected and returns to the
   * configured `redirectUri`. The redirect is asynchronous — the page keeps rendering
   * until the browser navigates; handle that interim state to prevent your
   * login screen appearing twice.
   *
   * @param options - Logout behavior options
   *
   * @example
   * ```typescript
   * // Local logout only (default)
   * sdk.logout();
   *
   * // Also end the UiPath session
   * sdk.logout({ endSession: true });
   * ```
   */
  public logout(options?: LogoutOptions): void {
    // Secret-based auth has no session to end — skip silently
    if (this.#config && hasSecretConfig(this.#config)) {
      return;
    }
    this.#authService?.logout(options);
    this.#initialized = false;
  }

  /**
   * Updates the access token used for API requests.
   * Use this to inject or refresh a token externally.
   *
   * @param tokenInfo - The token information containing the access token, type, expiration, and optional refresh/ID tokens
   */
  public updateToken(tokenInfo: TokenInfo): void {
    this.#authService?.updateToken(tokenInfo);
  }

}
