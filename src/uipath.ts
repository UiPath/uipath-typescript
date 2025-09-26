import { UiPathConfig } from './core/config/config';
import { ExecutionContext } from './core/context/execution';
import { AuthService } from './core/auth/service';
import { 
  MaestroProcessesService,
  ProcessInstancesService,
  EntityService,
  TaskService,
  ProcessService,
  BucketService,
  QueueService,
  AssetService
} from './services';
import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from './core/config/sdk-config';
import { validateConfig, normalizeBaseUrl } from './core/config/config-utils';
import { TokenManager } from './core/auth/token-manager';
import { telemetryClient, trackEvent } from './core/telemetry';
import { OAuthContext } from './core/auth/types';

type ServiceConstructor<T> = new (config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager) => T;

export class UiPath {
  private config: UiPathConfig;
  private executionContext: ExecutionContext;
  private authService: AuthService;
  private initialized: boolean = false;
  private readonly _services: Map<string, any> = new Map();

  constructor(config: UiPathSDKConfig) {
    // Check if we're in OAuth callback and can use stored context
    const storedContext = this.getStoredOAuthContext();
    const isInOAuthCallback = this.isInOAuthCallback();
    
    // Use stored context if available and in OAuth callback, otherwise use provided config
    let effectiveConfig: UiPathSDKConfig;
    if (isInOAuthCallback && storedContext) {
      effectiveConfig = {
        baseUrl: storedContext.baseUrl,
        orgName: storedContext.orgName,
        tenantName: storedContext.tenantName,
        clientId: storedContext.clientId,
        redirectUri: storedContext.redirectUri,
        scope: storedContext.scope
      } as UiPathSDKConfig;
    } else {
      effectiveConfig = config;
    }
    
    // Validate and normalize the configuration
    validateConfig(effectiveConfig);
    
    // Initialize core components
    this.config = new UiPathConfig({
      baseUrl: normalizeBaseUrl(effectiveConfig.baseUrl),
      orgName: effectiveConfig.orgName,
      tenantName: effectiveConfig.tenantName,
      secret: hasSecretConfig(effectiveConfig) ? effectiveConfig.secret : undefined,
      clientId: hasOAuthConfig(effectiveConfig) ? effectiveConfig.clientId : undefined,
      redirectUri: hasOAuthConfig(effectiveConfig) ? effectiveConfig.redirectUri : undefined,
      scope: hasOAuthConfig(effectiveConfig) ? effectiveConfig.scope : undefined
    });

    this.executionContext = new ExecutionContext();
    this.authService = new AuthService(this.config, this.executionContext);

    // Initialize telemetry with SDK configuration
    telemetryClient.initialize({
      baseUrl: effectiveConfig.baseUrl,
      orgName: effectiveConfig.orgName,
      tenantName: effectiveConfig.tenantName,
      clientId: hasOAuthConfig(effectiveConfig) ? effectiveConfig.clientId : undefined,
      redirectUri: hasOAuthConfig(effectiveConfig) ? effectiveConfig.redirectUri : undefined
    });

    // Track SDK initialization
    trackEvent('Sdk.Auth');

    // Auto-initialize for secret-based auth
    if (hasSecretConfig(effectiveConfig)) {
      this.authService.authenticateWithSecret(effectiveConfig.secret);
      this.initialized = true;
    }
    
    // Mark as initialized if in OAuth callback with stored context
    if (isInOAuthCallback && storedContext) {
      this.initialized = true;
    }
  }

  /**
   * Initialize the SDK based on the provided configuration.
   * This method handles both OAuth flow initiation and completion automatically.
   * For secret-based authentication, initialization is automatic.
   */
  public async initialize(): Promise<void> {
    // For secret-based auth, it's already initialized in constructor
    if (hasSecretConfig(this.config)) {
      return;
    }

    try {
      // Check for OAuth callback first
      if (this.isInOAuthCallback()) {
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

      if (this.authService.hasValidToken()) {
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
    if (typeof window === 'undefined') return false;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const hasCodeVerifier = sessionStorage.getItem('uipath_sdk_code_verifier');
    
    return !!(code && hasCodeVerifier);
  }

  /**
   * Complete OAuth authentication flow (only call if isInOAuthCallback() is true)
   */
  public async completeOAuth(): Promise<boolean> {
    if (!this.isInOAuthCallback()) {
      throw new Error('Not in OAuth callback state. Call initialize() first to start OAuth flow.');
    }

    try {
      const success = await this.authService.authenticate(this.config);
      if (success && this.authService.hasValidToken()) {
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

  private getService<T>(serviceConstructor: ServiceConstructor<T>): T {
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
        instances: this.getService(ProcessInstancesService)
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

  /**
   * Get stored OAuth context from session storage
   */
  private getStoredOAuthContext(): OAuthContext | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem('uipath_sdk_oauth_context');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Failed to parse stored OAuth context:', error);
      return null;
    }
  }
}

// Factory function for creating UiPath instance
export default function uipath(config: UiPathSDKConfig): UiPath {
  return new UiPath(config);
}
