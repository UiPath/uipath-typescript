import { UiPathConfig } from './core/config/config';
import { ExecutionContext } from './core/context/execution-context';
import { AuthService } from './core/auth/auth-service';
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
   * This method is only required for OAuth-based authentication.
   * For secret-based authentication, initialization is automatic.
   */
  public async initialize(): Promise<void> {
    // If already initialized or using secret auth, return immediately
    if (this.initialized || hasSecretConfig(this.config)) {
      return;
    }

    try {
      // If the OAuth flow redirects, the promise from `authenticate` will not resolve,
      // and execution will stop here.
      const success = await this.authService.authenticate(this.config);

      if (!success || !this.authService.hasValidToken()) {
        // If authenticate() returns false, it means a valid token could not be obtained.
        // This could be due to invalid config or a failure in the OAuth callback.
        // We don't throw an error for the initial OAuth redirect because that won't return.
        throw new Error('Failed to obtain a valid authentication token.');
      }

      this.initialized = true;
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
}

// Factory function for creating UiPath instance
export default function uipath(config: UiPathSDKConfig): UiPath {
  return new UiPath(config);
}
