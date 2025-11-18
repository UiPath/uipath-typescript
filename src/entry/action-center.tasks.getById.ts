import { TaskService as InternalTaskService } from '../services/action-center/tasks';
import type { TaskGetByIdOptions } from '../models/action-center/tasks.types';
import type { TaskGetResponse } from '../models/action-center/tasks.models';
import { UiPathSDKConfig } from '../core/config/sdk-config';
import { createSdkRuntime } from './sdk-runtime';

/**
 * Method-level entrypoint for TaskService.getById.
 */
export async function getById(
  config: UiPathSDKConfig,
  id: number,
  options: TaskGetByIdOptions = {},
  folderId?: number
): Promise<TaskGetResponse> {
  const runtime = createSdkRuntime(config);
  const service = new InternalTaskService(
    runtime.config,
    runtime.executionContext,
    runtime.tokenManager
  );

  return service.getById(id, options, folderId);
}

