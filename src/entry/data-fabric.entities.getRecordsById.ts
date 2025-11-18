import { EntityService as InternalEntityService } from '../services/data-fabric/entities';
import type { EntityRecord, EntityGetRecordsByIdOptions } from '../models/data-fabric/entities.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../utils/pagination/types';
import { UiPathSDKConfig } from '../core/config/sdk-config';
import { createSdkRuntime } from './sdk-runtime';

/**
 * Method-level entrypoint for EntityService.getRecordsById.
 */
export async function getRecordsById<
  T extends EntityGetRecordsByIdOptions = EntityGetRecordsByIdOptions
>(
  config: UiPathSDKConfig,
  entityId: string,
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<EntityRecord>
    : NonPaginatedResponse<EntityRecord>
> {
  const runtime = createSdkRuntime(config);
  const service = new InternalEntityService(
    runtime.config,
    runtime.executionContext,
    runtime.tokenManager
  );

  return service.getRecordsById(entityId, options);
}

