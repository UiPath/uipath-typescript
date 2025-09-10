import type { 
  RawTaskCreateResponse,
  RawTaskGetResponse, 
  TaskType,
  TaskAssignmentResponse, 
  TaskAssignmentRequest,
  TaskCompletionRequest,
  TaskCompleteOptions,
  TaskAssignOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskCreateRequest,
  TaskGetUsersOptions,
  UserLoginInfo
} from './task.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

// Define the task service interface
export interface TaskServiceModel {
  getAll<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;

  getById(id: number, options?: TaskGetByIdOptions, folderId?: number): Promise<TaskGetResponse>;

  create(request: TaskCreateRequest, folderId: number): Promise<TaskCreateResponse>;

  assign(request: TaskAssignmentRequest, folderId?: number): Promise<TaskAssignmentResponse[]>;
  
  reassign(request: TaskAssignmentRequest, folderId?: number): Promise<TaskAssignmentResponse[]>;
  
  unassign(taskId: number, folderId?: number): Promise<TaskAssignmentResponse[]>;
  
  complete(
    taskType: TaskType,
    request: TaskCompletionRequest,
    folderId: number
  ): Promise<void>;

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
  assign(options: TaskAssignOptions): Promise<TaskAssignmentResponse[]>;

  /**
   * Reassigns this task to a new user
   * 
   * @param options - Assignment options (requires at least one of: userId, userNameOrEmail)
   * @returns Promise resolving to task assignment results
   */
  reassign(options: TaskAssignOptions): Promise<TaskAssignmentResponse[]>;

  /**
   * Unassigns this task (removes current assignee)
   * 
   * @returns Promise resolving to task assignment results
   */
  unassign(): Promise<TaskAssignmentResponse[]>;

  /**
   * Completes this task with optional data and action
   * 
   * @param options - Completion options
   * @returns Promise resolving to void
   */
  complete(options: TaskCompleteOptions): Promise<void>;
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
    async assign(options: TaskAssignOptions): Promise<TaskAssignmentResponse[]> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      const request: TaskAssignmentRequest = {
        taskId: taskData.id,
        userId: options.userId || 0, // Will be handled by userNameOrEmail if userId is not provided, 0 is considered as invalid user id
        userNameOrEmail: options.userNameOrEmail
      };
      
      return service.assign(request, taskData.organizationUnitId);
    },
    
    async reassign(options: TaskAssignOptions): Promise<TaskAssignmentResponse[]> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      const request: TaskAssignmentRequest = {
        taskId: taskData.id,
        userId: options.userId || 0, // Will be handled by userNameOrEmail if userId is not provided, 0 is considered as invalid user id
        userNameOrEmail: options.userNameOrEmail
      };
      
      return service.reassign(request, taskData.organizationUnitId);
    },

    async unassign(): Promise<TaskAssignmentResponse[]> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      return service.unassign(taskData.id, taskData.organizationUnitId);
    },

    async complete(options: TaskCompleteOptions): Promise<void> {
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