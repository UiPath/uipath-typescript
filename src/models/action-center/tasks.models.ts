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
} from './tasks.types';
import { OperationResponse } from '../common/types';
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
   *  @example
   * ```typescript
   * // Standard array return
   * const tasks = await sdk.tasks.getAll();
   * 
   * // Get tasks within a specific folder
   * const tasks = await sdk.tasks.getAll({ 
   *   folderId: 123
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.tasks.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.tasks.getAll({ cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.tasks.getAll({
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  getAll<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;

  /**
   * Gets a task by ID
   * IMPORTANT: For form tasks, folderId must be provided.
   * @param id - The ID of the task to retrieve
   * @param options - Optional query parameters
   * @param folderId - Optional folder ID (REQUIRED for form tasks)
   * @returns Promise resolving to the task
   * {@link TaskGetResponse}
   * @example
   * ```typescript
   * // Get a task by ID
   * const task = await sdk.tasks.getById(<taskId>);
   * 
   * // Get a form task by ID
   * const formTask = await sdk.tasks.getById(<taskId>, <folderId>);
   * 
   * // Access form task properties
   * console.log(formTask.formLayout);
   * ```
   */
  getById(id: number, options?: TaskGetByIdOptions, folderId?: number): Promise<TaskGetResponse>;

  /**
   * Creates a new task
   * 
   * @param options - The task to be created
   * @param folderId - Required folder ID
   * @returns Promise resolving to the created task
   * {@link TaskCreateResponse}
   * @example
   * ```typescript
   * import { TaskPriority } from '@uipath/uipath-typescript';
   * const task = await sdk.tasks.create({
   *   title: "My Task",
   *   priority: TaskPriority.Medium
   * }, <folderId>); // folderId is required
   * ```
   */
  create(options: TaskCreateOptions, folderId: number): Promise<TaskCreateResponse>;

  /**
   * Assigns tasks to users
   * 
   * @param options - Single task assignment or array of task assignments
   * @returns Promise resolving to array of task assignment results
   * {@link TaskAssignmentResponse}
   * @example
   * ```typescript
   * // Assign a single task to a user by ID
   * const result = await sdk.tasks.assign({
   *   taskId: <taskId>,
   *   userId: <userId>
   * });
   * 
   * or
   * 
   * const task = await sdk.tasks.getById(<taskId>);
   * const result = await task.assign({
   *   userId: <userId>
   * });
   * 
   * // Assign a single task to a user by email
   * const result = await sdk.tasks.assign({
   *   taskId: <taskId>,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Assign multiple tasks
   * const result = await sdk.tasks.assign([
   *   { taskId: <taskId1>, userId: <userId> },
   *   { taskId: <taskId2>, userNameOrEmail: "user@example.com" }
   * ]);
   * ```
   */
  assign(options: TaskAssignmentOptions | TaskAssignmentOptions[]): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>;
  
  /**
   * Reassigns tasks to new users
   * 
   * @param options - Single task assignment or array of task assignments
   * @returns Promise resolving to array of task assignment results
   * {@link TaskAssignmentResponse}
   * @example
   * ```typescript
   * // Reassign a single task to a user by ID
   * const result = await sdk.tasks.reassign({
   *   taskId: <taskId>,
   *   userId: <userId>
   * });
   * 
   * or
   * 
   * const task = await sdk.tasks.getById(<taskId>);
   * const result = await task.reassign({
   *   userId: <userId>
   * });
   * 
   * // Reassign a single task to a user by email
   * const result = await sdk.tasks.reassign({
   *   taskId: <taskId>,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Reassign multiple tasks
   * const result = await sdk.tasks.reassign([
   *   { taskId: <taskId1>, userId: <userId> },
   *   { taskId: <taskId2>, userNameOrEmail: "user@example.com" }
   * ]);
   * ```
   */
  reassign(options: TaskAssignmentOptions | TaskAssignmentOptions[]): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>>;
  
  /**
   * Unassigns tasks (removes current assignees)
   * 
   * @param taskId - Single task ID or array of task IDs to unassign
   * @returns Promise resolving to array of task assignment results
   * {@link TaskAssignmentResponse}
   * @example
   * ```typescript
   * // Unassign a single task
   * const result = await sdk.tasks.unassign(<taskId>);
   * 
   * or
   * 
   * const task = await sdk.tasks.getById(<taskId>);
   * const result = await task.unassign();
   * 
   * // Unassign multiple tasks
   * const result = await sdk.tasks.unassign([<taskId1>, <taskId2>, <taskId3>]);
   * ```
   */
  unassign(taskId: number | number[]): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>>;
  
  /**
   * Completes a task with the specified type and data
   * 
   * @param taskType - The type of task (Form, App, or External)
   * @param options - The completion options
   * @param folderId - Required folder ID
   * @returns Promise resolving to completion result
   * {@link TaskCompletionOptions}
   * @example
   * ```typescript
   * // Complete an app task
   * await sdk.tasks.complete(TaskType.App, {
   *   taskId: <taskId>,
   *   data: {},
   *   action: "submit"
   * }, <folderId>); // folderId is required
   * 
   * // Complete an external task
   * await sdk.tasks.complete(TaskType.External, {
   *   taskId: <taskId>
   * }, <folderId>); // folderId is required
   * ```
   */
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
   * @returns Promise resolving to either an array of users NonPaginatedResponse<UserLoginInfo> or a PaginatedResponse<UserLoginInfo> when pagination options are used. 
   * {@link UserLoginInfo}
   * @example
   * ```typescript
   * // Get users from a folder
   * const users = await sdk.tasks.getUsers(<folderId>);
   * 
   * // Access user properties
   * console.log(users.items[0].name);
   * console.log(users.items[0].emailAddress);
   * ```
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
      
      return service.assign(assignmentOptions);
    },
    
    async reassign(options: TaskAssignOptions): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      const assignmentOptions: TaskAssignmentOptions = {
        taskId: taskData.id,
        userId: options.userId || 0, // Will be handled by userNameOrEmail if userId is not provided, 0 is considered as invalid user id
        userNameOrEmail: options.userNameOrEmail
      };
      
      return service.reassign(assignmentOptions);
    },

    async unassign(): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      
      return service.unassign(taskData.id);
    },

    async complete(options: TaskCompleteOptions): Promise<OperationResponse<TaskCompletionOptions>> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      const folderId = taskData.folderId;
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