import { EntityService as InternalEntityService } from '../services/data-fabric/entities';
import { UiPathSDKConfig } from '../core/config/sdk-config';
import { createSdkRuntime } from './sdk-runtime';

/**
 * Service-level entrypoint for Data Fabric EntityService.
 *
 * This wrapper class mirrors the internal EntityService API but
 * accepts the public UiPathSDKConfig so it can be instantiated
 * directly by consumers without touching internal types.
 */
export class EntityService extends InternalEntityService {
  constructor(config: UiPathSDKConfig) {
    const runtime = createSdkRuntime(config);
    super(runtime.config, runtime.executionContext, runtime.tokenManager);
  }
}

