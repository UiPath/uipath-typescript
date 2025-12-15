import { UiPathConfig } from './core/config/config';
import { ExecutionContext } from './core/context/execution';
import { AuthService } from './core/auth/service';
import {
  MaestroProcessesService,
  ProcessInstancesService,
  ProcessIncidentsService,
  CasesService,
  CaseInstancesService,
  EntityService,
  TaskService,
  ProcessService,
  BucketService,
  QueueService,
  AssetService
} from './services';
import { UiPathSDKConfig, PartialUiPathConfig, hasOAuthConfig, hasSecretConfig } from './core/config/sdk-config';
import { validateConfig, normalizeBaseUrl, isCompleteConfig } from './core/config/config-utils';
import { TokenManager } from './core/auth/token-manager';
import { telemetryClient, trackEvent } from './core/telemetry';
import { loadFromMetaTags } from './core/config/runtime';

type ServiceConstructor<T> = new (config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager) => T;

export class UiPath {
  private config?: UiPathConfig;
  private executionContext?: ExecutionContext;
  private authService?: AuthService;
  private initialized: boolean = false;
  private readonly _services: Map<string, any> = new Map();
  private partialConfig?: PartialUiPathConfig;

  constructor(config?: PartialUiPathConfig) {
    // Try to load from meta tags
    const metaConfig = loadFromMetaTags();

    if (config) {
      if (isCompleteConfig(config)) {
        // Full config provided - initialize directly
        this.initializeWithConfig(config);
      } else {
        // Partial config - merge with meta tags
        const merged: PartialUiPathConfig = { ...metaConfig, ...config }; // Constructor config overrides meta tags

        if (isCompleteConfig(merged)) {
          this.initializeWithConfig(merged);
        } else {
          // Store partial config to merge later in initialize()
          this.partialConfig = config;
        }
      }
    } else if (metaConfig && isCompleteConfig(metaConfig)) {
      // No config provided but meta tags have complete config - auto-initialize
      this.initializeWithConfig(metaConfig);
    }
    // If still not initialized, wait for initialize() to be called
  }

  private initializeWithConfig(config: UiPathSDKConfig): void {
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

  private loadConfig(): UiPathSDKConfig {
    // Load from meta tags only (no fetch fallback)
    const metaConfig = loadFromMetaTags();

    // Merge with any partial config from constructor (constructor overrides meta tags)
    const merged = { ...metaConfig, ...this.partialConfig };

    if (!isCompleteConfig(merged)) {
      throw new Error(
        'UiPath SDK configuration not found. ' +
        'Ensure @uipath/apps-runtime-config is set up in your bundler to inject configuration during development and build.'
      );
    }

    return merged;
  }

  /**
   * Initialize the SDK based on the provided configuration.
   * This method handles both OAuth flow initiation and completion automatically.
   * For secret-based authentication, initialization is automatic.
   * If no config was provided in constructor, loads from meta tags.
   */
  public async initialize(): Promise<void> {
    // Load config from meta tags if not provided in constructor
    if (!this.config) {
      const loadedConfig = this.loadConfig();
      this.initializeWithConfig(loadedConfig);
    }

    // For secret-based auth, it's already initialized
    if (hasSecretConfig(this.config!)) {
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
      await this.authService!.authenticate(this.config!);

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

    // Load config if not yet initialized
    if (!this.config) {
      const loadedConfig = this.loadConfig();
      this.initializeWithConfig(loadedConfig);
    }

    try {
      const success = await this.authService!.authenticate(this.config!);
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
    return this.authService?.hasValidToken() ?? false;
  }

  /**
   * Get the current authentication token
   */
  public getToken(): string | undefined {
    return this.authService?.getToken();
  }

  private getService<T>(serviceConstructor: ServiceConstructor<T>): T {
    if (!this.config || !this.executionContext || !this.authService) {
      throw new Error('SDK not initialized. Call initialize() first.');
    }

    const serviceName = serviceConstructor.name;
    if (!this._services.has(serviceName)) {
      const serviceInstance = new serviceConstructor(this.config, this.executionContext, this.authService.getTokenManager());
      this._services.set(serviceName, serviceInstance);
    }

    return this._services.get(serviceName) as T;
  }

  /**
   * Access to Maestro services
   */
  get maestro() {
    return {
      /**
       * Access to Maestro Processes service
       */
      processes: Object.assign(this.getService(MaestroProcessesService), {
        /**
         * Access to Process Instances service
         */
        instances: this.getService(ProcessInstancesService),
        /**
         * Access to Process Incidents service
         */
        incidents: this.getService(ProcessIncidentsService)
      }),
      /**
       * Access to Maestro Cases service
       */
      cases: Object.assign(this.getService(CasesService), {
        /**
         * Access to Case Instances service
         */
        instances: this.getService(CaseInstancesService)
      })
    };
  }

  /**
   * Access to Entity service
   */
  get entities(): EntityService {
    return this.getService(EntityService);
  }

  /**
   * Access to Tasks service
   */
  get tasks(): TaskService {
    return this.getService(TaskService);
  }

  /**
   * Access to Orchestrator Processes service
   */
  get processes(): ProcessService {
    return this.getService(ProcessService);
  }

  /**
   * Access to Orchestrator Buckets service
   */
  get buckets(): BucketService {
    return this.getService(BucketService);
  }
  
  /**
   * Access to Orchestrator Queues service
   */
  get queues(): QueueService {
    return this.getService(QueueService);
  }

  /**
   * Access to Orchestrator Assets service
   */
  get assets(): AssetService {
    return this.getService(AssetService);
  }
}

// Factory function for creating UiPath instance
export default function uipath(config?: PartialUiPathConfig): UiPath {
  return new UiPath(config);
}
