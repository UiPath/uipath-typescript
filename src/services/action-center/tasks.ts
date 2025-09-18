import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { 
  TaskCreateOptions, 
  TaskAssignmentOptions,
  TaskAssignmentResponse,
  TasksUnassignOptions,
  TaskCompletionOptions,
  TaskType,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  UserLoginInfo,
  TaskGetUsersOptions,
} from '../../models/action-center/tasks.types';
import {
  TaskServiceModel,
  TaskGetResponse,
  TaskCreateResponse,
  createTaskWithMethods
} from '../../models/action-center/tasks.models';
import { OperationResponse } from '../../models/common/types';
import { pascalToCamelCaseKeys, camelToPascalCaseKeys, transformData, applyDataTransforms, addPrefixToKeys } from '../../utils/transform';
import { TaskStatusMap, TaskTimeMap } from '../../models/action-center/tasks.constants';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_ID } from '../../utils/constants/headers';
import { TASK_ENDPOINTS } from '../../utils/constants/endpoints';
import { ODATA_PREFIX, ODATA_PAGINATION, ODATA_OFFSET_PARAMS } from '../../utils/constants/common';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { TaskAssignmentResponseCollection, TaskGetFormOptions, TasksAssignOptions } from '../../models/action-center/tasks.internal-types';
import { track } from '../../core/telemetry';
import { processODataArrayResponse } from '../../utils/object';

/**
 * Service for interacting with UiPath Tasks API
 */
export class TaskService extends BaseService implements TaskServiceModel {
  /**
   * @hideconstructor
   */
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
   * const task = await sdk.tasks.create({
   *   title: "My Task",
   *   priority: TaskPriority.Medium,
   *   data: { key: "value" }
   * }, 123); // folderId is required
   * ```
   */
  @track('Tasks.Create')
  async create(task: TaskCreateOptions, folderId: number): Promise<TaskCreateResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    const externalTask = {
      ...task,
      type: TaskType.External //currently only external task is supported
    };
    
    const response = await this.post<TaskCreateResponse>(
      TASK_ENDPOINTS.CREATE_GENERIC_TASK,
      externalTask,
      { headers }
    );
    // Transform time fields for consistency
    const normalizedData = transformData(response.data, TaskTimeMap);
    const transformedData = applyDataTransforms(normalizedData, { field: 'status', valueMap: TaskStatusMap });
    return createTaskWithMethods(transformedData, this) as TaskCreateResponse;
  }

  /**
   * Gets users in the given folder who have Tasks.View and Tasks.Edit permissions
   * 
   * The method returns either:
   * - An array of users (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param folderId - The folder ID to get users from
   * @param options - Optional query and pagination parameters
   * @returns Promise resolving to an array of users or paginated result
   * 
   * @example
   * ```typescript
   * // Standard array return
   * const users = await sdk.tasks.getUsers(123);
   * 
   * // Get users with filtering
   * const users = await sdk.tasks.getUsers(123, { 
   *   filter: "name eq 'abc'"
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.tasks.getUsers(123, { pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.tasks.getUsers(123, { cursor: page1.nextCursor });
   * }
   * 
   * // Jump to specific page
   * const page5 = await sdk.tasks.getUsers(123, {
   *   jumpToPage: 5,
   *   pageSize: 10
   * });
   * ```
   */
  @track('Tasks.GetUsers')
  async getUsers<T extends TaskGetUsersOptions = TaskGetUsersOptions>(
    folderId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<UserLoginInfo>
      : NonPaginatedResponse<UserLoginInfo>
  > {
    // Transformation function for users
    const transformUserResponse = (user: any) => 
      pascalToCamelCaseKeys(user) as UserLoginInfo;

    // Add folderId to options so the centralized helper can handle it properly
    const optionsWithFolder = { ...options, folderId };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: (folderId) => TASK_ENDPOINTS.GET_TASK_USERS(folderId!), // Use folderId from centralized helper
      getByFolderEndpoint: TASK_ENDPOINTS.GET_TASK_USERS(folderId), // Use the passed folderId
      transformFn: transformUserResponse,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,      
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,          
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM             
        }
      }
    }, optionsWithFolder) as any;
  }
  
  /**
   * Gets tasks across folders with optional filtering and folder scoping
   * 
   * The method returns either:
   * - An array of tasks (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options - Query options including optional folderId and pagination options
   * @returns Promise resolving to an array of tasks or paginated result
   * 
   * @example
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
  @track('Tasks.GetAll')
  async getAll<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  > {
    // Transformation function for tasks
    const transformTaskResponse = (task: any) => {
      const transformedTask = transformData(pascalToCamelCaseKeys(task) as TaskGetResponse, TaskTimeMap);
      return createTaskWithMethods(
        applyDataTransforms(transformedTask, { field: 'status', valueMap: TaskStatusMap }),
        this
      ) as TaskGetResponse;
    };

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => TASK_ENDPOINTS.GET_TASKS_ACROSS_FOLDERS,
      transformFn: transformTaskResponse,
      processParametersFn: this.processTaskParameters,
      excludeFromPrefix: ['event'], // Exclude 'event' key from ODATA prefix transformation
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: ODATA_PAGINATION.ITEMS_FIELD,
        totalCountField: ODATA_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: ODATA_OFFSET_PARAMS.PAGE_SIZE_PARAM,      // OData OFFSET parameter
          offsetParam: ODATA_OFFSET_PARAMS.OFFSET_PARAM,           // OData OFFSET parameter
          countParam: ODATA_OFFSET_PARAMS.COUNT_PARAM              // OData OFFSET parameter
        }
      }
    }, options) as any;
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
   * const task = await sdk.tasks.getById(123);
   * 
   * // If the task is a form task, it will automatically return form-specific data
   * ```
   */
  @track('Tasks.GetById')
  async getById(id: number, options: TaskGetByIdOptions = {}, folderId?: number): Promise<TaskGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    // prefix all keys in options
    const keysToPrefix = Object.keys(options);
    const apiOptions = addPrefixToKeys(options, ODATA_PREFIX, keysToPrefix);
    const response = await this.get<TaskGetResponse>(
      TASK_ENDPOINTS.GET_BY_ID(id),
      { 
        params: apiOptions,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase and normalize time fields
    const transformedTask = transformData(pascalToCamelCaseKeys(response.data) as TaskGetResponse, TaskTimeMap);
    
    // Check if this is a form task and get form-specific data if it is
    if (transformedTask.type === TaskType.Form) {
      const formOptions: TaskGetFormOptions = { expandOnFormLayout: true };
      return this.getFormTaskById(id, folderId || transformedTask.organizationUnitId, formOptions);
    }
    
    return createTaskWithMethods(
      applyDataTransforms(transformedTask, { field: 'status', valueMap: TaskStatusMap }),
      this
    ) as TaskGetResponse;
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
   * const result = await sdk.tasks.assign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Assign a single task to a user by email
   * const result = await sdk.tasks.assign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Assign multiple tasks
   * const result = await sdk.tasks.assign([
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
  @track('Tasks.Assign')
  async assign(taskAssignments: TaskAssignmentOptions | TaskAssignmentOptions[], folderId?: number): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Normalize input to array
    const assignmentArray = Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments];
    
    const options: TasksAssignOptions = {
      taskAssignments: assignmentArray
    };
    
    // Convert options to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(options);
    
    const response = await this.post<TaskAssignmentResponseCollection>(
      TASK_ENDPOINTS.ASSIGN_TASKS,
      pascalOptions,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as TaskAssignmentResponseCollection;
    
    // Process OData array response - empty array = success, non-empty = error
    return processODataArrayResponse(transformedResponse, assignmentArray);
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
   * const result = await sdk.tasks.reassign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Reassign a single task to a user by email
   * const result = await sdk.tasks.reassign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Reassign multiple tasks
   * const result = await sdk.tasks.reassign([
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
  @track('Tasks.Reassign')
  async reassign(taskAssignments: TaskAssignmentOptions | TaskAssignmentOptions[], folderId?: number): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Normalize input to array
    const assignmentArray = Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments];
    
    const options: TasksAssignOptions = {
      taskAssignments: assignmentArray
    };
    
    // Convert options to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(options);
    
    const response = await this.post<TaskAssignmentResponseCollection>(
      TASK_ENDPOINTS.REASSIGN_TASKS,
      pascalOptions,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as TaskAssignmentResponseCollection;
    
    // Process OData array response - empty array = success, non-empty = error
    return processODataArrayResponse(transformedResponse, assignmentArray);
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
   * const result = await sdk.tasks.unassign(123);
   * 
   * // Unassign multiple tasks
   * const result = await sdk.tasks.unassign([123, 456, 789]);
   * ```
   */
  @track('Tasks.Unassign')
  async unassign(taskIds: number | number[], folderId?: number): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    // Normalize input to array
    const taskIdArray = Array.isArray(taskIds) ? taskIds : [taskIds];
    
    const options: TasksUnassignOptions = {
      taskIds: taskIdArray
    };
    
    const response = await this.post<TaskAssignmentResponseCollection>(
      TASK_ENDPOINTS.UNASSIGN_TASKS,
      options,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as TaskAssignmentResponseCollection;
    
    // Process OData array response - empty array = success, non-empty = error
    // Return the task IDs that were unassigned
    return processODataArrayResponse(transformedResponse, taskIdArray.map(id => ({ taskId: id })));
  }

  /**
   * Completes a task with the specified type and data
   * 
   * @param completionType - The type of task (Form, App, or Generic)
   * @param options - The completion options
   * @param folderId - Required folder ID
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Complete an app task
   * await sdk.tasks.complete(TaskType.App, {
   *   taskId: 456,
   *   data: {},
   *   action: "submit"
   * }, 123); // folderId is required
   * 
   * // Complete an external task
   * await sdk.tasks.complete(TaskType.ExternalTask, {
   *   taskId: 789
   * }, 123); // folderId is required
   * ```
   */
  @track('Tasks.Complete')
  async complete(completionType: TaskType, options: TaskCompletionOptions, folderId: number): Promise<OperationResponse<TaskCompletionOptions>> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    let endpoint: string;
    
    switch (completionType) {
      case TaskType.Form:
        endpoint = TASK_ENDPOINTS.COMPLETE_FORM_TASK;
        break;
      case TaskType.App:
        endpoint = TASK_ENDPOINTS.COMPLETE_APP_TASK;
        break;
      default:
        endpoint = TASK_ENDPOINTS.COMPLETE_GENERIC_TASK;
        break;
    }
    
    // CompleteAppTask returns 204 no content
    await this.post<void>(endpoint, options, { headers });
    
    // Return success with the request context data
    return {
      success: true,
      data: options
    };
  }

  /**
   * Gets a form task by ID (private method)
   * 
   * @param id - The ID of the form task to retrieve
   * @param folderId - Required folder ID
   * @param options - Optional query parameters
   * @returns Promise resolving to the form task
   */
  private async getFormTaskById(id: number, folderId: number, options: TaskGetFormOptions = {}): Promise<TaskGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    const response = await this.get<TaskGetResponse>(
      TASK_ENDPOINTS.GET_TASK_FORM_BY_ID,
      { 
        params: {
          taskId: id,
          ...options
        },
        headers
      }
    );
    const transformedFormTask = transformData(response.data, TaskTimeMap);
    return createTaskWithMethods(
      applyDataTransforms(transformedFormTask, { field: 'status', valueMap: TaskStatusMap }),
      this
    ) as TaskGetResponse;
  }

  /**
   * Process parameters for task queries with folder filtering
   * @param options - The REST API options to process
   * @param folderId - Optional folder ID to filter by
   * @returns Processed options with folder filtering applied if needed
   * @private
   */
  private processTaskParameters = (options: Record<string, any>, folderId?: number): Record<string, any> => {
    const processedOptions = { ...options };
    if (folderId) {
      // Create or add to existing filter for folder-specific queries
      if (processedOptions.filter) {
        processedOptions.filter = `${processedOptions.filter} and organizationUnitId eq ${folderId}`;
      } else {
        processedOptions.filter = `organizationUnitId eq ${folderId}`;
      }
    }
    return processedOptions;
  }
} 