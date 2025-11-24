import { UiPathConfig } from './core/config/config';
import { ExecutionContext } from './core/context/execution';
import { UiPathClient } from './core/client';
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
import { UiPathSDKConfig } from './core/config/sdk-config';
import { TokenManager } from './core/auth/token-manager';

type ServiceConstructor<T> = new (config: UiPathConfig, context: ExecutionContext, tokenManager: TokenManager) => T;

/**
 * UiPath SDK - Legacy class providing all services through property getters.
 *
 * Extends UiPathClient. For modular usage, use UiPathClient.connect() with .get() instead.
 */
export class UiPath extends UiPathClient {
  private readonly _services: Map<string, any> = new Map();

  constructor(config: UiPathSDKConfig) {
    super(config);
  }

  private getService<T>(serviceConstructor: ServiceConstructor<T>): T {
    const serviceName = serviceConstructor.name;
    if (!this._services.has(serviceName)) {
      const serviceInstance = new serviceConstructor(
        this.getConfig(),
        this.getContext(),
        this.getTokenManager()
      );
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
