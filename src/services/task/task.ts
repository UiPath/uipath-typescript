import { BaseService } from '../baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { TokenManager } from '../../core/auth/tokenManager';
import { 
  TaskCreateRequest, 
  TaskCreateResponse, 
  TaskGetResponse, 
  TaskAssignmentRequest,
  TasksAssignRequest,
  TasksUnassignRequest,
  TaskAssignmentResult,
  TaskAssignmentResultCollection,
  TaskCompletionRequest,
  TaskType,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskGetFormOptions,
  UserLoginInfo,
  UserLoginInfoCollection,
  TaskGetUsersOptions
} from '../../models/task/task.types';
import {
  Task,
  TaskServiceModel
} from '../../models/task/task.models';
import { pascalToCamelCaseKeys, camelToPascalCaseKeys, transformData, transformApiResponse, addPrefixToKeys } from '../../utils/transform';
import { TaskStatusMap, TaskTimeMap } from '../../models/task/task.constants';
import { CollectionResponse } from '../../models/common/commonTypes';
import { createHeaders } from '../../utils/http/headers';

/**
 * Service for interacting with UiPath Tasks API
 */
export class TaskService extends BaseService implements TaskServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Creates a new task
   * @param task - The task to be created
   * @param folderId - Required folder ID
   * @returns Promise resolving to the created task
   * 
   * @example
   * ```typescript
   * const task = await sdk.task.create({
   *   title: "My Task",
   *   priority: TaskPriority.Medium,
   *   data: { key: "value" }
   * }, 123); // folderId is required
   * ```
   */
  async create(task: TaskCreateRequest, folderId: number): Promise<Task<TaskCreateResponse>> {
    const headers = createHeaders(folderId);
    
    const externalTask = {
      ...task,
      type: TaskType.External //currently only external task is supported
    };
    
    const response = await this.post<TaskCreateResponse>(
      '/tasks/GenericTasks/CreateTask',
      externalTask,
      { headers }
    );
    // Transform time fields for consistency
    const normalizedData = transformData(response.data, TaskTimeMap);
    return new Task<TaskCreateResponse>(
      transformApiResponse(normalizedData, { field: 'status', valueMap: TaskStatusMap }),
      this
    );
  }

  /**
   * Gets users in the given folder who have Tasks.View and Tasks.Edit permissions
   * 
   * @param folderId - The folder ID to get users from
   * @param options - Optional query parameters
   * @returns Promise resolving to an array of users
   * 
   * @example
   * ```typescript
   * // Get all users with task permissions in a folder
   * const users = await sdk.task.getUsers(123);
   * 
   * // Get users with filtering
   * const users = await sdk.task.getUsers(123, { 
   *   filter: "name eq 'abc'"
   * });
   * ```
   */
  async getUsers(folderId: number, options: TaskGetUsersOptions = {}): Promise<UserLoginInfo[]> {
    const headers = createHeaders(folderId);
    
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    const response = await this.get<UserLoginInfoCollection>(
      `/odata/Tasks/UiPath.Server.Configuration.OData.GetTaskUsers(organizationUnitId=${folderId})`,
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    return response.data?.value.map(user => pascalToCamelCaseKeys(user) as UserLoginInfo);
  }
  
  /**
   * Gets tasks across folders with optional query parameters
   * 
   * @param options - Query options
   * @param folderId - Optional folder ID
   * @returns Promise resolving to an array of tasks
   * 
   * @example
   * ```typescript
   * // Get all tasks
   * const tasks = await sdk.task.getAll();
   * ```
   */
  async getAll(options: TaskGetAllOptions = {}, folderId?: number): Promise<Task<TaskGetResponse>[]> {
    const headers = createHeaders(folderId);
    // prefix all keys except 'event'
    const keysToPrefix = Object.keys(options).filter(k => k !== 'event');
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    const response = await this.get<CollectionResponse<TaskGetResponse>>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders',
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response Task array from PascalCase to camelCase and normalize time fields
    const transformedTasks = response.data?.value.map(task => 
      transformData(pascalToCamelCaseKeys(task) as TaskGetResponse, TaskTimeMap)
    );
    
    return transformedTasks.map(task => 
      new Task<TaskGetResponse>(
        transformApiResponse(task, { field: 'status', valueMap: TaskStatusMap }),
        this
      )
    );
  }

  /**
   * Gets a task by ID
   * 
   * @param id - The ID of the task to retrieve
   * @param options - Optional query parameters
   * @param folderId - Optional folder ID
   * @returns Promise resolving to the task (form tasks will return form-specific data)
   * 
   * @example
   * ```typescript
   * // Get task by ID
   * const task = await sdk.task.getById(123);
   * 
   * // If the task is a form task, it will automatically return form-specific data
   * ```
   */
  async getById(id: number, options: TaskGetByIdOptions = {}, folderId?: number): Promise<Task<TaskGetResponse>> {
    const headers = createHeaders(folderId);
    // prefix all keys in options
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, '$', keysToPrefix);
    const response = await this.get<TaskGetResponse>(
      `/odata/Tasks(${id})`,
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase and normalize time fields
    const transformedTask = transformData(pascalToCamelCaseKeys(response.data) as TaskGetResponse, TaskTimeMap);
    
    // Check if this is a form task and get form-specific data if it is
    if (transformedTask.type === TaskType.Form) {
      return this.getFormTaskById(id, folderId || transformedTask.organizationUnitId);
    }
    
    return new Task<TaskGetResponse>(
      transformApiResponse(transformedTask, { field: 'status', valueMap: TaskStatusMap }),
      this
    );
  }

  /**
   * Assigns tasks to users
   * 
   * @param taskAssignments - Single task assignment or array of task assignments
   * @param folderId - Optional folder ID
   * @returns Promise resolving to array of task assignment results
   * 
   * @example
   * ```typescript
   * // Assign a single task to a user by ID
   * const result = await sdk.task.assign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Assign a single task to a user by email
   * const result = await sdk.task.assign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Assign multiple tasks
   * const result = await sdk.task.assign([
   *   {
   *     taskId: 123,
   *     userId: 456
   *   },
   *   {
   *     taskId: 789,
   *     userNameOrEmail: "user@example.com"
   *   }
   * ]);
   * ```
   */
  async assign(taskAssignments: TaskAssignmentRequest | TaskAssignmentRequest[], folderId?: number): Promise<TaskAssignmentResult[]> {
    const headers = createHeaders(folderId);
    
    const request: TasksAssignRequest = {
      taskAssignments: Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments]
    };
    
    // Convert request to PascalCase for API
    const pascalRequest = camelToPascalCaseKeys(request);
    
    const response = await this.post<TaskAssignmentResultCollection>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks',
      pascalRequest,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase and map 'value' to 'error'
    const transformedResponse = pascalToCamelCaseKeys(response.data) as any;
    const result = transformData(transformedResponse, { value: 'error' });
    return result.error;
  }

  /**
   * Reassigns tasks to new users
   * 
   * @param taskAssignments - Single task assignment or array of task assignments
   * @param folderId - Optional folder ID
   * @returns Promise resolving to array of task assignment results
   * 
   * @example
   * ```typescript
   * // Reassign a single task to a user by ID
   * const result = await sdk.task.reassign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Reassign a single task to a user by email
   * const result = await sdk.task.reassign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Reassign multiple tasks
   * const result = await sdk.task.reassign([
   *   {
   *     taskId: 123,
   *     userId: 456
   *   },
   *   {
   *     taskId: 789,
   *     userNameOrEmail: "user@example.com"
   *   }
   * ]);
   * ```
   */
  async reassign(taskAssignments: TaskAssignmentRequest | TaskAssignmentRequest[], folderId?: number): Promise<TaskAssignmentResult[]> {
    const headers = createHeaders(folderId);
    
    const request: TasksAssignRequest = {
      taskAssignments: Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments]
    };
    
    // Convert request to PascalCase for API
    const pascalRequest = camelToPascalCaseKeys(request);
    
    const response = await this.post<TaskAssignmentResultCollection>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.ReassignTasks',
      pascalRequest,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase and map 'value' to 'error'
    const transformedResponse = pascalToCamelCaseKeys(response.data) as any;
    const result = transformData(transformedResponse, { value: 'error' });
    return result.error;
  }

  /**
   * Unassigns tasks (removes current assignees)
   * 
   * @param taskIds - Single task ID or array of task IDs to unassign
   * @param folderId - Optional folder ID
   * @returns Promise resolving to array of task assignment results
   * 
   * @example
   * ```typescript
   * // Unassign a single task
   * const result = await sdk.task.unassign(123);
   * 
   * // Unassign multiple tasks
   * const result = await sdk.task.unassign([123, 456, 789]);
   * ```
   */
  async unassign(taskIds: number | number[], folderId?: number): Promise<TaskAssignmentResult[]> {
    const headers = createHeaders(folderId);
    
    const request: TasksUnassignRequest = {
      taskIds: Array.isArray(taskIds) ? taskIds : [taskIds]
    };
    
    const response = await this.post<TaskAssignmentResultCollection>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.UnassignTasks',
      request,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase and map 'value' to 'error'
    const transformedResponse = pascalToCamelCaseKeys(response.data) as any;
    const result = transformData(transformedResponse, { value: 'error' });
    return result.error;
  }

  /**
   * Completes a task with the specified type and data
   * 
   * @param completionType - The type of task (Form, App, or Generic)
   * @param request - The completion request data
   * @param folderId - Required folder ID
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Complete an app task
   * await sdk.task.complete(TaskType.App, {
   *   taskId: 456,
   *   data: {},
   *   action: "submit"
   * }, 123); // folderId is required
   * 
   * // Complete an external task
   * await sdk.task.complete(TaskType.ExternalTask, {
   *   taskId: 789
   * }, 123); // folderId is required
   * ```
   */
  async complete(completionType: TaskType, request: TaskCompletionRequest, folderId: number): Promise<void> {
    const headers = createHeaders(folderId);
    
    let endpoint: string;
    
    switch (completionType) {
      case TaskType.Form:
        endpoint = '/forms/TaskForms/CompleteTask';
        break;
      case TaskType.App:
        endpoint = '/tasks/AppTasks/CompleteAppTask';
        break;
      default:
        endpoint = '/tasks/GenericTasks/CompleteTask';
        break;
    }
    
    await this.post<void>(endpoint, request, { headers });
  }

  /**
   * Gets a form task by ID (private method)
   * 
   * @param id - The ID of the form task to retrieve
   * @param folderId - Required folder ID
   * @param options - Optional query parameters
   * @returns Promise resolving to the form task
   */
  private async getFormTaskById(id: number, folderId: number, options: TaskGetFormOptions = {}): Promise<Task<TaskGetResponse>> {
    const headers = createHeaders(folderId);
    
    const response = await this.get<TaskGetResponse>(
      '/forms/TaskForms/GetTaskFormById',
      { 
        params: {
          taskId: id,
          ...options
        },
        headers
      }
    );
    const transformedFormTask = transformData(response.data, TaskTimeMap);
    return new Task<TaskGetResponse>(
      transformApiResponse(transformedFormTask, { field: 'status', valueMap: TaskStatusMap }),
      this
    );
  }
} 