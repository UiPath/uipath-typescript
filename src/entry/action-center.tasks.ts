import { TaskService as InternalTaskService } from '../services/action-center/tasks';
import { UiPathSDKConfig } from '../core/config/sdk-config';
import { createSdkRuntime } from './sdk-runtime';

/**
 * Service-level entrypoint for Action Center TaskService.
 */
export class TaskService extends InternalTaskService {
  constructor(config: UiPathSDKConfig) {
    const runtime = createSdkRuntime(config);
    super(runtime.config, runtime.executionContext, runtime.tokenManager);
  }
}

