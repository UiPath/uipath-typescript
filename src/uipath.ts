import { UiPath as UiPathCore } from './core/uipath';
import {
  MaestroProcessesService,
  ProcessInstancesService,
  ProcessIncidentsService,
  CasesService,
  CaseInstancesService,
  EntityService,
  ChoiceSetService,
  TaskService,
  ProcessService,
  BucketService,
  QueueService,
  AssetService
} from './services';
import { UiPathSDKConfig } from './core/config/sdk-config';

type ServiceConstructor<T> = new (uiPath: UiPathCore) => T;

/**
 * UiPath SDK - Legacy class providing all services through property getters.
 *
 * Extends core UiPath. For modular usage, import from specific service modules.
 *
 * @deprecated This class is provided for backward compatibility only.
 * Use the modular pattern with `@uipath/uipath-typescript/core` instead.
 *
 * @example
 * ```typescript
 * // Legacy pattern (deprecated)
 * import { UiPath } from '@uipath/uipath-typescript';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 * const data = await sdk.entities.getAll();
 * ```
 *
 * @example
 * ```typescript
 * // New modular pattern (recommended)
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Entities } from '@uipath/uipath-typescript/entities';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 * const entitiesService = new Entities(sdk);
 * const data = await entitiesService.getAll();
 * ```
 */
export class UiPath extends UiPathCore {
  private readonly _services: Map<string, any> = new Map();

  private getService<T>(serviceConstructor: ServiceConstructor<T>): T {
    const serviceName = serviceConstructor.name;
    if (!this._services.has(serviceName)) {
      const serviceInstance = new serviceConstructor(this);
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
  get entities() {
    return Object.assign(this.getService(EntityService), {
      /**
       * Access to ChoiceSet service for managing choice sets
       */
      choicesets: this.getService(ChoiceSetService)
    });
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
