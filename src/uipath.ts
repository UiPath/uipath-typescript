import { UiPathConfig } from './core/config/config';
import { ExecutionContext } from './core/context/executionContext';
import { AuthService } from './core/auth/authService';
import { 
  MaestroProcessesService,
  ProcessInstancesService,
  CaseService,
  EntityService,
  TaskService
} from './services';
import { UiPathSDKConfig, hasOAuthConfig, hasSecretConfig } from './core/config/sdkConfig';
import { validateConfig, normalizeBaseUrl } from './core/config/configUtils';

type ServiceConstructor<T> = new (config: UiPathConfig, context: ExecutionContext) => T;

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
      redirectUri: hasOAuthConfig(config) ? config.redirectUri : undefined
    });

    this.executionContext = new ExecutionContext();
    this.authService = new AuthService(this.config, this.executionContext);
  }

  /**
   * Initialize the SDK based on the provided configuration
   * This method handles both secret-based and OAuth-based authentication
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
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
    if (!this.initialized) {
      throw new Error('SDK must be initialized before accessing services. Call initialize() first.');
    }

    if (!this._services.has(serviceName)) {
      const serviceInstance = new serviceConstructor(this.config, this.executionContext);
      this._services.set(serviceName, serviceInstance);
    }

    return this._services.get(serviceName) as T;
  }

  /**
   * Access to Maestro Processes service
   */
  get maestroProcesses(): MaestroProcessesService {
    return this.getService(MaestroProcessesService);
  }

  /**
   * Access to Maestro Process Instances service
   */
  get processInstances(): ProcessInstancesService {
    return this.getService(ProcessInstancesService);
  }

  /**
   * Access to Case service
   */
  get case(): CaseService {
    return this.getService(CaseService);
  }
  
  /**
   * Access to Entity service
   */
  get entity(): EntityService {
    return this.getService(EntityService);
  }

  /**
   * Access to Tasks service
   */
  get task(): TaskService {
    return this.getService(TaskService);
  }
}

// Factory function for creating UiPath instance
export default function uipath(config: UiPathSDKConfig): UiPath {
  return new UiPath(config);
}
