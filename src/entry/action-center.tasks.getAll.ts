import { TaskService as InternalTaskService } from '../services/action-center/tasks';
import type { TaskGetAllOptions } from '../models/action-center/tasks.types';
import type { TaskGetResponse } from '../models/action-center/tasks.models';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../utils/pagination';
import { UiPathSDKConfig } from '../core/config/sdk-config';
import { createSdkRuntime } from './sdk-runtime';

/**
 * Method-level entrypoint for TaskService.getAll.
 */
export async function getAll<
  T extends TaskGetAllOptions = TaskGetAllOptions
>(
  config: UiPathSDKConfig,
  options?: T
): Promise<
  T extends HasPaginationOptions<T>
    ? PaginatedResponse<TaskGetResponse>
    : NonPaginatedResponse<TaskGetResponse>
> {
  const runtime = createSdkRuntime(config);
  const service = new InternalTaskService(
    runtime.config,
    runtime.executionContext,
    runtime.tokenManager
  );

  return service.getAll(options);
}

