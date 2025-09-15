import type { 
  RawTaskCreateResponse,
  RawTaskGetResponse, 
  TaskType,
  TaskAssignmentOptions,
  TaskAssignmentResponse,
  TaskCompletionOptions,
  TaskCompleteOptions,
  TaskAssignOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskCreateOptions,
  TaskGetUsersOptions,
  UserLoginInfo
} from './task.types';
import { OperationResponse } from '../common/common-types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Action Center
 * 
 * Tasks are task-based automation components that can be integrated into applications and processes. They represent discrete units of work that can be triggered and monitored through the UiPath API. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)
 *
*/
export interface TaskServiceModel {
  /**
   * Gets all tasks across folders with optional filtering
   * 
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to either an array of tasks NonPaginatedResponse<TaskGetResponse> or a PaginatedResponse<TaskGetResponse> when pagination options are used.
   * {@link TaskGetResponse}
   */
  getAll<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;

  getById(id: number, options?: TaskGetByIdOptions, folderId?: number): Promise<TaskGetResponse>;

  create(options: TaskCreateOptions, folderId: number): Promise<TaskCreateResponse>;

  assign(options: TaskAssignmentOptions | TaskAssignmentOptions[], folderId?: number): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>;
  
  reassign(options: TaskAssignmentOptions | TaskAssignmentOptions[], folderId?: number): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>;
  
  unassign(taskId: number | number[], folderId?: number): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>>;
  
  complete(
    taskType: TaskType,
    options: TaskCompletionOptions,
    folderId: number
  ): Promise<OperationResponse<TaskCompletionOptions>>;

  /**
   * Gets users in the given folder who have Tasks.View and Tasks.Edit permissions
   * Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   * 
   * @param folderId - The folder ID to get users from
   * @param options - Optional query and pagination parameters
   * @returns Promise resolving to NonPaginatedResponse or a paginated result
   */
  getUsers<T extends TaskGetUsersOptions = TaskGetUsersOptions>(
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<UserLoginInfo>
      : NonPaginatedResponse<UserLoginInfo>
  >;
}

// Method interface that will be added to task objects
export interface TaskMethods {
  /**
   * Assigns this task to a user or users
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
   */
  assign(options: TaskAssignOptions): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>;

  /**
   * Reassigns this task to a new user
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
   */
  reassign(options: TaskAssignOptions): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>;

  /**
   * Unassigns this task (removes current assignee)
   * 
   * @returns Promise resolving to task assignment results
   */
  unassign(): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>>;

  /**
   * Completes this task with optional data and action
   * 
   * @param options - Completion options
   * @returns Promise resolving to completion result
   */
  complete(options: TaskCompleteOptions): Promise<OperationResponse<TaskCompletionOptions>>;
}

// Combined types for task data with methods
export type TaskGetResponse = RawTaskGetResponse & TaskMethods;
export type TaskCreateResponse = RawTaskCreateResponse & TaskMethods;

/**
 * Creates methods for a task
 * 
 * @param taskData - The task data (response from API)
 * @param service - The task service instance
 * @returns Object containing task methods
 */
function createTaskMethods(taskData: RawTaskGetResponse | RawTaskCreateResponse, service: TaskServiceModel): TaskMethods {
  return {
    async assign(options: TaskAssignOptions): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      const assignmentOptions: TaskAssignmentOptions = {
        taskId: taskData.id,
        userId: options.userId || 0, // Will be handled by userNameOrEmail if userId is not provided, 0 is considered as invalid user id
        userNameOrEmail: options.userNameOrEmail
      };
      
      return service.assign(assignmentOptions, taskData.organizationUnitId);
    },
    
    async reassign(options: TaskAssignOptions): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      const assignmentOptions: TaskAssignmentOptions = {
        taskId: taskData.id,
        userId: options.userId || 0, // Will be handled by userNameOrEmail if userId is not provided, 0 is considered as invalid user id
        userNameOrEmail: options.userNameOrEmail
      };
      
      return service.reassign(assignmentOptions, taskData.organizationUnitId);
    },

    async unassign(): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      return service.unassign(taskData.id, taskData.organizationUnitId);
    },

    async complete(options: TaskCompleteOptions): Promise<OperationResponse<TaskCompletionOptions>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      const folderId = taskData.organizationUnitId;
      if (!folderId) throw new Error('Folder ID is required');
      
      return service.complete(
        options.type,
        {
          taskId: taskData.id,
          data: options.data,
          action: options.action
        },
        folderId
      );
    }
  };
}

/**
 * Creates an actionable task by combining API task data with operational methods.
 * 
 * @param taskData - The task data from API
 * @param service - The task service instance
 * @returns A task object with added methods
 */
export function createTaskWithMethods(
  taskData: RawTaskGetResponse | RawTaskCreateResponse, 
  service: TaskServiceModel
): TaskGetResponse | TaskCreateResponse {
  const methods = createTaskMethods(taskData, service);
  return Object.assign({}, taskData, methods) as TaskGetResponse | TaskCreateResponse;
} 