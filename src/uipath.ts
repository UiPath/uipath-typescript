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
import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from './core/config/sdk-config';
import { validateConfig, normalizeBaseUrl } from './core/config/config-utils';
import { TokenManager } from './core/auth/token-manager';
import { telemetryClient, trackEvent } from './core/telemetry';

type ServiceConstructor<T> = new (config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager) => T;

export class UiPath {
  private config: UiPathConfig;
  private executionContext: ExecutionContext;
  private authService: AuthService;
  private initialized: boolean = false;
  private readonly _services: Map<string, any> = new Map();

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
      scope: hasOAuthConfig(config) ? config.scope : undefined,
      tokenStorage: hasOAuthConfig(config) ? config.tokenStorage : undefined
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
   * For secret-based authentication, initialization is automatic.
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
   * Logout the user and clear all authentication state
   * Removes tokens from storage and clears OAuth context
   */
  public logout(): void {
    this.authService.logout();
    this.initialized = false; // Reset initialized state
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
export default function uipath(config: UiPathSDKConfig): UiPath {
  return new UiPath(config);
}
