import type {
  RawTaskCreateResponse,
  RawTaskDataGetResponse,
  RawTaskGetResponse,
  RawTaskCommentGetResponse,
  Tag,
  TaskAssignmentOptions,
  TaskAssignmentResponse,
  TaskCompletionOptions,
  TaskCompleteOptions,
  TaskAssignOptions,
  TaskEditMetadataOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskCreateOptions,
  TaskGetUsersOptions,
  TaskCommentGetByTaskIdOptions,
  UserLoginInfo
} from './tasks.types';
import { FolderScopedOptions, OperationResponse } from '../common/types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Action Center
 *
 * Tasks are task-based automation components that can be integrated into applications and processes. They represent discrete units of work that can be triggered and monitored through the UiPath API. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Tasks } from '@uipath/uipath-typescript/tasks';
 *
 * const tasks = new Tasks(sdk);
 * const allTasks = await tasks.getAll();
 * ```
 */
export interface TaskServiceModel {
  /**
   * Gets all tasks across folders with optional filtering
   * 
   * @param options - Query options including optional folderId, asTaskAdmin flag and pagination options
   * @returns Promise resolving to either an array of tasks NonPaginatedResponse<TaskGetResponse> or a PaginatedResponse<TaskGetResponse> when pagination options are used.
   * {@link TaskGetResponse}
   *  @example
   * ```typescript
   * // Standard array return
   * const allTasks = await tasks.getAll();
   *
   * // Get tasks within a specific folder
   * const folderTasks = await tasks.getAll({
   *   folderId: 123
   * });
   *
   * // Get tasks with admin permissions
   * // This fetches tasks across folders where the user has Task.View, Task.Edit and TaskAssignment.Create permissions
   * const adminTasks = await tasks.getAll({
   *   asTaskAdmin: true
   * });
   *
   * // Get tasks without admin permissions (default)
   * // This fetches tasks across folders where the user has Task.View and Task.Edit permissions
   * const userTasks = await tasks.getAll({
   *   asTaskAdmin: false
   * });
   *
   * // First page with pagination
   * const page1 = await tasks.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await tasks.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await tasks.getAll({
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
   * @param id - The ID of the task to retrieve
   * @param options - Optional query parameters including taskType for faster retrieval {@link TaskGetByIdOptions}
   * @param folderId - Optional folder ID (REQUIRED when options.taskType is provided)
   * @returns Promise resolving to the task
   * {@link TaskGetResponse}
   * @example
   * ```typescript
   * // Get a task by ID
   * const task = await tasks.getById(<taskId>);
   *
   * // Get a form task by ID
   * const formTask = await tasks.getById(<taskId>, {}, <folderId>);
   *
   * // Access form task properties
   * console.log(formTask.formLayout);
   *
   * // Get a document validation task by ID (faster with taskType provided in the options)
   * const dvTask = await tasks.getById(<taskId>, { taskType: TaskType.DocumentValidation }, <folderId>);
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
   * const task = await tasks.create({
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
   * const result = await tasks.assign({
   *   taskId: <taskId>,
   *   userId: <userId>
   * });
   *
   * // Or using instance method
   * const task = await tasks.getById(<taskId>);
   * const result = await task.assign({
   *   userId: <userId>
   * });
   *
   * // Assign a single task to a user by email
   * const result = await tasks.assign({
   *   taskId: <taskId>,
   *   userNameOrEmail: "user@example.com"
   * });
   *
   * // Assign multiple tasks
   * const result = await tasks.assign([
   *   { taskId: <taskId1>, userId: <userId> },
   *   { taskId: <taskId2>, userNameOrEmail: "user@example.com" }
   * ]);
   * ```
   *
   * @example Group assignment
   * ```typescript
   * import { TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks';
   *
   * // Assign to a directory group by userId + criteria — Action Center
   * // distributes the task across the group's members based on the criteria
   * const result = await tasks.assign({
   *   taskId: <taskId>,
   *   userId: <groupId>, // a DirectoryGroup id from tasks.getUsers()
   *   assignmentCriteria: TaskAssignmentCriteria.AllUsers
   * });
   *
   * // ...or identify the group by name instead of id
   * const result2 = await tasks.assign({
   *   taskId: <taskId>,
   *   userNameOrEmail: "<groupName>",
   *   assignmentCriteria: TaskAssignmentCriteria.AllUsers
   * });
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
   * const result = await tasks.reassign({
   *   taskId: <taskId>,
   *   userId: <userId>
   * });
   *
   * // Or using instance method
   * const task = await tasks.getById(<taskId>);
   * const result = await task.reassign({
   *   userId: <userId>
   * });
   *
   * // Reassign a single task to a user by email
   * const result = await tasks.reassign({
   *   taskId: <taskId>,
   *   userNameOrEmail: "user@example.com"
   * });
   *
   * // Reassign multiple tasks
   * const result = await tasks.reassign([
   *   { taskId: <taskId1>, userId: <userId> },
   *   { taskId: <taskId2>, userNameOrEmail: "user@example.com" }
   * ]);
   * ```
   *
   * @example Group reassignment
   * ```typescript
   * import { TaskAssignmentCriteria } from '@uipath/uipath-typescript/tasks';
   *
   * // Reassign to a directory group by userId + criteria
   * const result = await tasks.reassign({
   *   taskId: <taskId>,
   *   userId: <groupId>, // a DirectoryGroup id from tasks.getUsers()
   *   assignmentCriteria: TaskAssignmentCriteria.AllUsers
   * });
   *
   * // ...or identify the group by name instead of id
   * const result2 = await tasks.reassign({
   *   taskId: <taskId>,
   *   userNameOrEmail: "<groupName>",
   *   assignmentCriteria: TaskAssignmentCriteria.AllUsers
   * });
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
   * const result = await tasks.unassign(<taskId>);
   *
   * // Or using instance method
   * const task = await tasks.getById(<taskId>);
   * const result = await task.unassign();
   *
   * // Unassign multiple tasks
   * const result = await tasks.unassign([<taskId1>, <taskId2>, <taskId3>]);
   * ```
   */
  unassign(taskId: number | number[]): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>>;
  
  /**
   * Completes a task with the specified type and data
   *
   * @param options - The completion options including task type, taskId, data, and action
   * @param folderId - Required folder ID
   * @returns Promise resolving to completion result
   * {@link TaskCompleteOptions}
   * @example
   * ```typescript
   * // Complete an app task
   * await tasks.complete({
   *   type: TaskType.App,
   *   taskId: <taskId>,
   *   data: {},
   *   action: "submit"
   * }, <folderId>); // folderId is required
   *
   * // Complete an external task
   * await tasks.complete({
   *   type: TaskType.External,
   *   taskId: <taskId>
   * }, <folderId>); // folderId is required
   * ```
   */
  complete(
    options: TaskCompletionOptions,
    folderId: number
  ): Promise<OperationResponse<TaskCompletionOptions>>;

  /**
   * Gets task users (users, robots, groups etc) in the given folder who have Tasks.View and Tasks.Edit permissions
   * Returns a NonPaginatedResponse with data and totalCount when no pagination parameters are provided,
   * or a PaginatedResponse when any pagination parameter is provided
   * 
   * @param folderId - The folder ID to get task users from
   * @param options - Optional query and pagination parameters
   * @returns Promise resolving to either an array of task users NonPaginatedResponse<UserLoginInfo> or a PaginatedResponse<UserLoginInfo> when pagination options are used. 
   * {@link UserLoginInfo}
   * @example
   * ```typescript
   * // Get task users from a folder
   * const users = await tasks.getUsers(<folderId>);
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

  /**
   * Gets a task's data (form/task payload) and core metadata, by task id.
   *
   * Works for any task type (Form, App, External, etc.).
   *
   * @param id - The task id to fetch data for
   * @param options - Folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving to {@link TaskDataGetResponse}
   * @example
   * ```typescript
   * const task = await tasks.getDataById(<taskId>, { folderId: <folderId> });
   * console.log(task.data);
   * ```
   */
  getDataById(id: number, options?: FolderScopedOptions): Promise<TaskDataGetResponse>;

  /**
   * Gets a task's data (form/task payload) and core metadata, by task key.
   *
   * Works for any task type (Form, App, External, etc.).
   *
   * @param key - The task key (GUID) to fetch data for
   * @param options - Folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving to {@link TaskDataGetResponse}
   * @example
   * ```typescript
   * const task = await tasks.getDataByKey("<taskKey>", { folderId: <folderId> });
   * console.log(task.data);
   * ```
   */
  getDataByKey(key: string, options?: FolderScopedOptions): Promise<TaskDataGetResponse>;

  /**
   * Saves a task's data (form/task payload), replacing the existing payload.
   *
   * @param taskId - The task to update
   * @param data - The task data to save (replaces the existing payload)
   * @param options - Folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving once the save completes
   * @example
   * ```typescript
   * await tasks.saveData(<taskId>, { amount: 1200, approved: true }, { folderId: <folderId> });
   * ```
   */
  saveData(taskId: number, data: Record<string, unknown>, options?: FolderScopedOptions): Promise<void>;

  /**
   * Saves the tags on a task, replacing any existing tags.
   *
   * @param taskId - The task to tag
   * @param tags - The tags to set
   * @param options - Folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving once the save completes
   * @example
   * ```typescript
   * await tasks.saveTags(<taskId>, [{ name: "priority", displayName: "Priority", displayValue: "High" }], { folderId: <folderId> });
   * ```
   */
  saveTags(taskId: number, tags: Tag[], options?: FolderScopedOptions): Promise<void>;

  /**
   * Edits a task's metadata (title, priority, catalog association, etc.).
   *
   * @param taskId - Id of the task to edit
   * @param options - Fields to change plus folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving once the edit completes
   * @example
   * ```typescript
   * import { TaskPriority } from '@uipath/uipath-typescript/tasks';
   * await tasks.editMetadata(<taskId>, { title: "Review invoice", priority: TaskPriority.High, folderId: <folderId> });
   * ```
   */
  editMetadata(taskId: number, options?: TaskEditMetadataOptions): Promise<void>;

  /**
   * Gets the comments for a task.
   *
   * @param taskId - The task to list comments for
   * @param options - Folder scope (folderId, folderKey, or folderPath) plus query and pagination options
   * @returns Promise resolving to either a {@link NonPaginatedResponse} or {@link PaginatedResponse} of {@link TaskCommentGetResponse} items, paginated when pagination options are used.
   * @example
   * ```typescript
   * const comments = await tasks.getComments(<taskId>, { folderId: <folderId> });
   *
   * // Paginated
   * const page1 = await tasks.getComments(<taskId>, { folderId: <folderId>, pageSize: 20 });
   * if (page1.hasNextPage) {
   *   const page2 = await tasks.getComments(<taskId>, { folderId: <folderId>, cursor: page1.nextCursor });
   * }
   * ```
   */
  getComments<T extends TaskCommentGetByTaskIdOptions = TaskCommentGetByTaskIdOptions>(
    taskId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskCommentGetResponse>
      : NonPaginatedResponse<TaskCommentGetResponse>
  >;

  /**
   * Creates a comment on a task.
   *
   * @param taskId - Id of the task the comment belongs to
   * @param text - Comment text (max 512 characters)
   * @param options - Folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving to {@link TaskCommentGetResponse}
   * @example
   * ```typescript
   * const comment = await tasks.createComment(<taskId>, "Escalated", { folderId: <folderId> });
   * ```
   */
  createComment(taskId: number, text: string, options?: FolderScopedOptions): Promise<TaskCommentGetResponse>;
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

  /**
   * Saves this task's data (form/task payload), replacing the existing payload.
   *
   * @param data - The task data to save
   * @param options - Optional folder scope override (defaults to this task's folder)
   * @returns Promise resolving once the save completes
   */
  saveData(data: Record<string, unknown>, options?: FolderScopedOptions): Promise<void>;

  /**
   * Saves the tags on this task, replacing any existing tags.
   *
   * @param tags - The tags to set
   * @param options - Optional folder scope override (defaults to this task's folder)
   * @returns Promise resolving once the save completes
   */
  saveTags(tags: Tag[], options?: FolderScopedOptions): Promise<void>;

  /**
   * Edits this task's metadata (title, priority, catalog association, etc.).
   *
   * @param options - Fields to change plus optional folder scope override (defaults to this task's folder)
   * @returns Promise resolving once the edit completes
   */
  editMetadata(options?: TaskEditMetadataOptions): Promise<void>;

  /**
   * Gets the comments on this task.
   *
   * @param options - Optional folder scope override (defaults to this task's folder) plus query and pagination options
   * @returns Promise resolving to either a {@link NonPaginatedResponse} or {@link PaginatedResponse} of {@link TaskCommentGetResponse} items, paginated when pagination options are used.
   */
  getComments<T extends TaskCommentGetByTaskIdOptions = TaskCommentGetByTaskIdOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskCommentGetResponse>
      : NonPaginatedResponse<TaskCommentGetResponse>
  >;

  /**
   * Creates a comment on this task.
   *
   * @param text - Comment text (max 512 characters)
   * @param options - Optional folder scope override (defaults to this task's folder)
   * @returns Promise resolving to the created comment {@link TaskCommentGetResponse}
   */
  createComment(text: string, options?: FolderScopedOptions): Promise<TaskCommentGetResponse>;
}

// Combined types for task data with methods
export type TaskGetResponse = RawTaskGetResponse & TaskMethods;
export type TaskCreateResponse = RawTaskCreateResponse & TaskMethods;

/**
 * A task's data payload + core metadata, as returned by `getDataById` / `getDataByKey`.
 */
export interface TaskDataGetResponse extends RawTaskDataGetResponse {}

/**
 * A task comment as returned by the service.
 */
export interface TaskCommentGetResponse extends RawTaskCommentGetResponse {}

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

      const criteria = options.assignmentCriteria !== undefined ? { assignmentCriteria: options.assignmentCriteria } : {};
      const assignmentOptions: TaskAssignmentOptions = 'userId' in options && options.userId !== undefined
        ? { taskId: taskData.id, userId: options.userId, ...criteria }
        : { taskId: taskData.id, userNameOrEmail: options.userNameOrEmail!, ...criteria };

      return service.assign(assignmentOptions);
    },
    
    async reassign(options: TaskAssignOptions): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
      if (!taskData.id) throw new Error('Task ID is undefined');

      const criteria = options.assignmentCriteria !== undefined ? { assignmentCriteria: options.assignmentCriteria } : {};
      const assignmentOptions: TaskAssignmentOptions = 'userId' in options && options.userId !== undefined
        ? { taskId: taskData.id, userId: options.userId, ...criteria }
        : { taskId: taskData.id, userNameOrEmail: options.userNameOrEmail!, ...criteria };

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
        {
          type: options.type,
          taskId: taskData.id,
          data: options.data,
          action: options.action
        } as TaskCompletionOptions,
        folderId
      );
    },

    async saveData(data: Record<string, unknown>, options?: FolderScopedOptions): Promise<void> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      return service.saveData(taskData.id, data, resolveTaskFolder(options, taskData.folderId));
    },

    async saveTags(tags: Tag[], options?: FolderScopedOptions): Promise<void> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      return service.saveTags(taskData.id, tags, resolveTaskFolder(options, taskData.folderId));
    },

    async editMetadata(options?: TaskEditMetadataOptions): Promise<void> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      return service.editMetadata(taskData.id, resolveTaskFolder(options, taskData.folderId));
    },

    getComments<T extends TaskCommentGetByTaskIdOptions = TaskCommentGetByTaskIdOptions>(
      options?: T
    ): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<TaskCommentGetResponse>
        : NonPaginatedResponse<TaskCommentGetResponse>
    > {
      if (!taskData.id) throw new Error('Task ID is undefined');
      return service.getComments(taskData.id, resolveTaskFolder(options, taskData.folderId));
    },

    async createComment(text: string, options?: FolderScopedOptions): Promise<TaskCommentGetResponse> {
      if (!taskData.id) throw new Error('Task ID is undefined');
      return service.createComment(taskData.id, text, resolveTaskFolder(options, taskData.folderId));
    }
  };
}

/**
 * Defaults folder scope to the task's own folder when the caller did not specify one.
 */
function resolveTaskFolder<T extends FolderScopedOptions>(options: T | undefined, folderId: number): T {
  if (options && (options.folderId !== undefined || options.folderKey !== undefined || options.folderPath !== undefined)) {
    return options;
  }
  return { ...options, folderId } as T;
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