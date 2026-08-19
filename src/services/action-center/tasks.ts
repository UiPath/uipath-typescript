import { ValidationError } from '../../core/errors';
import { track } from '../../core/telemetry';
import { DEFAULT_TASK_EXPAND, TaskMap, TaskStatusMap } from '../../models/action-center/tasks.constants';
import { TASK_TYPE_ENDPOINTS, TaskAssignmentResponseCollection, TaskGetFormOptions, TasksAssignOptions } from '../../models/action-center/tasks.internal-types';
import {
  TaskCreateResponse,
  TaskDataGetResponse,
  TaskGetResponse,
  TaskCommentGetResponse,
  TaskServiceModel,
  createTaskWithMethods
} from '../../models/action-center/tasks.models';
import {
  Tag,
  TaskAssignmentOptions,
  TaskAssignmentResponse,
  TaskCompletionOptions,
  TaskCreateOptions,
  TaskEditMetadataOptions,
  TaskGetAllOptions,
  TaskGetByIdOptions,
  TaskGetUsersOptions,
  TaskCommentGetByTaskIdOptions,
  TaskSaveDataOptions,
  TaskType,
  TasksUnassignOptions,
  UserLoginInfo,
} from '../../models/action-center/tasks.types';
import { BaseOptions, FolderScopedOptions, OperationResponse } from '../../models/common/types';
import { ODATA_OFFSET_PARAMS, ODATA_PAGINATION, ODATA_PREFIX } from '../../utils/constants/common';
import { TASK_ENDPOINTS, TASK_NOTE_ENDPOINTS } from '../../utils/constants/endpoints';
import { FOLDER_ID } from '../../utils/constants/headers';
import { createHeaders } from '../../utils/http/headers';
import { resolveFolderHeaders } from '../../utils/folder/folder-headers';
import { processODataArrayResponse } from '../../utils/object';
import { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../utils/pagination';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import { addPrefixToKeys, applyDataTransforms, camelToPascalCaseKeys, pascalToCamelCaseKeys, transformData, transformOptions } from '../../utils/transform';
import { FolderScopedService } from '../folder-scoped';

/**
 * Service for interacting with UiPath Tasks API
 */
export class TaskService extends FolderScopedService implements TaskServiceModel {
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
    const normalizedData = transformData(response.data, TaskMap);
    const transformedData = applyDataTransforms(normalizedData, { field: 'status', valueMap: TaskStatusMap });
    return createTaskWithMethods(transformedData, this) as TaskCreateResponse;
  }

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
  
  @track('Tasks.GetAll')
  async getAll<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  > {
    // Determine which endpoint to use based on asTaskAdmin flag
    const endpoint = options?.asTaskAdmin
      ? TASK_ENDPOINTS.GET_TASKS_ACROSS_FOLDERS_ADMIN
      : TASK_ENDPOINTS.GET_TASKS_ACROSS_FOLDERS;

    // Transformation function for tasks
    const transformTaskResponse = (task: any) => {
      const transformedTask = transformData(pascalToCamelCaseKeys(task) as TaskGetResponse, TaskMap);
      return createTaskWithMethods(
        applyDataTransforms(transformedTask, { field: 'status', valueMap: TaskStatusMap }),
        this
      ) as TaskGetResponse;
    };

    // Rewrite renamed SDK field names → API names inside OData strings
    // before delegating, mirroring the transformRequest pattern used for
    // request bodies.
    const apiOptions = options ? transformOptions(options, TaskMap) : options;

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => endpoint,
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
    }, apiOptions) as any;
  }

  @track('Tasks.GetById')
  async getById(id: number, options: TaskGetByIdOptions = {}, folderId?: number): Promise<TaskGetResponse> {
    const { taskType, ...restOptions } = options;

    // If taskType is provided, skip the generic GET_BY_ID call and go directly to the type-specific endpoint
    if (taskType && taskType in TASK_TYPE_ENDPOINTS) {
      if (!folderId) {
        throw new ValidationError({ message: 'folderId is required when taskType is provided' });
      }
      return this.getByTaskType(id, folderId, taskType, restOptions);
    }

    const headers = createHeaders({ [FOLDER_ID]: folderId });

    // Add default expand parameters
    const modifiedOptions = this.addDefaultExpand(restOptions);

    // Rewrite renamed SDK field names → API names inside OData strings,
    // then prefix all keys for OData.
    const apiFieldOptions = transformOptions(modifiedOptions, TaskMap);
    const apiOptions = addPrefixToKeys(apiFieldOptions, ODATA_PREFIX, Object.keys(apiFieldOptions));
    const response = await this.get<TaskGetResponse>(
      TASK_ENDPOINTS.GET_BY_ID(id),
      {
        params: apiOptions,
        headers
      }
    );

    // Transform response from PascalCase to camelCase and normalize time fields
    const transformedTask = transformData(pascalToCamelCaseKeys(response.data) as TaskGetResponse, TaskMap);

    // Get task type from response and fetch type-specific data
    const resolvedFolderId = folderId || transformedTask.folderId;
    if (transformedTask.type in TASK_TYPE_ENDPOINTS) {
      return this.getByTaskType(id, resolvedFolderId, transformedTask.type, restOptions);
    }

    return createTaskWithMethods(
      applyDataTransforms(transformedTask, { field: 'status', valueMap: TaskStatusMap }),
      this
    ) as TaskGetResponse;
  }

  @track('Tasks.Assign')
  async assign(taskAssignments: TaskAssignmentOptions | TaskAssignmentOptions[]): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
    // Normalize input to array
    const assignmentArray = Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments];
    
    const options: TasksAssignOptions = {
      taskAssignments: assignmentArray
    };
    
    // Convert options to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(options);
    
    const response = await this.post<TaskAssignmentResponseCollection>(
      TASK_ENDPOINTS.ASSIGN_TASKS,
      pascalOptions
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as TaskAssignmentResponseCollection;
    
    // Process OData array response - empty array = success, non-empty = error
    return processODataArrayResponse(transformedResponse, assignmentArray);
  }

  @track('Tasks.Reassign')
  async reassign(taskAssignments: TaskAssignmentOptions | TaskAssignmentOptions[]): Promise<OperationResponse<TaskAssignmentOptions[] | TaskAssignmentResponse[]>> {
    // Normalize input to array
    const assignmentArray = Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments];
    
    const options: TasksAssignOptions = {
      taskAssignments: assignmentArray
    };
    
    // Convert options to PascalCase for API
    const pascalOptions = camelToPascalCaseKeys(options);
    
    const response = await this.post<TaskAssignmentResponseCollection>(
      TASK_ENDPOINTS.REASSIGN_TASKS,
      pascalOptions
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as TaskAssignmentResponseCollection;
    
    // Process OData array response - empty array = success, non-empty = error
    return processODataArrayResponse(transformedResponse, assignmentArray);
  }

  @track('Tasks.Unassign')
  async unassign(taskIds: number | number[]): Promise<OperationResponse<{ taskId: number }[] | TaskAssignmentResponse[]>> {
    // Normalize input to array
    const taskIdArray = Array.isArray(taskIds) ? taskIds : [taskIds];
    
    const options: TasksUnassignOptions = {
      taskIds: taskIdArray
    };
    
    const response = await this.post<TaskAssignmentResponseCollection>(
      TASK_ENDPOINTS.UNASSIGN_TASKS,
      options
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as TaskAssignmentResponseCollection;
    
    // Process OData array response - empty array = success, non-empty = error
    // Return the task IDs that were unassigned
    return processODataArrayResponse(transformedResponse, taskIdArray.map(id => ({ taskId: id })));
  }

  @track('Tasks.Complete')
  async complete(options: TaskCompletionOptions, folderId: number): Promise<OperationResponse<TaskCompletionOptions>> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });
    
    let endpoint: string;

    switch (options.type) {
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

  @track('Tasks.GetDataById')
  async getDataById(id: number, options?: FolderScopedOptions): Promise<TaskDataGetResponse> {
    if (!id) {
      throw new ValidationError({ message: 'id is required for getDataById' });
    }

    const headers = this.resolveFolder(options, 'Tasks.getDataById');
    return this.fetchTaskData(TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID, { taskId: id }, headers);
  }

  @track('Tasks.GetDataByKey')
  async getDataByKey(key: string, options?: FolderScopedOptions): Promise<TaskDataGetResponse> {
    if (!key) {
      throw new ValidationError({ message: 'key is required for getDataByKey' });
    }

    const headers = this.resolveFolder(options, 'Tasks.getDataByKey');
    return this.fetchTaskData(TASK_ENDPOINTS.GET_GENERIC_TASK_BY_KEY, { taskKey: key }, headers);
  }

  private async fetchTaskData(endpoint: string, params: Record<string, string | number>, headers: Record<string, string>): Promise<TaskDataGetResponse> {
    const response = await this.get<Record<string, unknown>>(endpoint, { params, headers });

    // Preserve the user-defined data payload keys verbatim; only transform system fields.
    // The generic-task endpoint already returns camelCase, so no case conversion is needed.
    const { data: userPayload, ...systemFields } = response.data;
    const transformed = transformData(systemFields, TaskMap) as TaskDataGetResponse;
    const withStatus = applyDataTransforms(transformed, { field: 'status', valueMap: TaskStatusMap }) as TaskDataGetResponse;
    return { ...withStatus, data: (userPayload ?? null) as Record<string, unknown> | null };
  }

  @track('Tasks.SaveData')
  async saveData(taskId: number, data: Record<string, unknown>, options?: TaskSaveDataOptions): Promise<void> {
    if (!taskId) {
      throw new ValidationError({ message: 'taskId is required for saveData' });
    }

    const headers = this.resolveFolder(options, 'Tasks.saveData');

    // The generic save endpoint rejects Form and App tasks, which have their own save endpoints.
    // Look the type up when the caller doesn't provide it so those tasks still route correctly.
    let type = options?.type;
    if (!type) {
      const task = await this.fetchTaskData(TASK_ENDPOINTS.GET_GENERIC_TASK_BY_ID, { taskId }, headers);
      type = task.type;
    }

    let endpoint: string;
    switch (type) {
      case TaskType.Form:
        endpoint = TASK_ENDPOINTS.SAVE_FORM_TASK_DATA;
        break;
      case TaskType.App:
        endpoint = TASK_ENDPOINTS.SAVE_APP_TASK_DATA;
        break;
      default:
        endpoint = TASK_ENDPOINTS.SAVE_TASK_DATA;
        break;
    }

    // Keep data keys verbatim.
    await this.put<void>(endpoint, { TaskId: taskId, Data: data }, { headers });
  }

  @track('Tasks.SaveTags')
  async saveTags(taskId: number, tags: Tag[], options?: FolderScopedOptions): Promise<void> {
    if (!taskId) {
      throw new ValidationError({ message: 'taskId is required for saveTags' });
    }

    const headers = this.resolveFolder(options, 'Tasks.saveTags');
    const body = { TaskId: taskId, Tags: tags.map((tag) => camelToPascalCaseKeys(tag)) };
    await this.put<void>(TASK_ENDPOINTS.SAVE_TASK_TAGS, body, { headers });
  }

  @track('Tasks.EditMetadata')
  async editMetadata(taskId: number, options?: TaskEditMetadataOptions): Promise<void> {
    if (!taskId) {
      throw new ValidationError({ message: 'taskId is required for editMetadata' });
    }

    const { folderId, folderKey, folderPath, expand: _expand, select: _select, unlinkTaskCatalog, ...metadata } = options ?? {};
    const headers = resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'Tasks.editMetadata', fallbackFolderKey: this.config.folderKey });
    const body = { taskId, ...metadata, ...(unlinkTaskCatalog !== undefined ? { unsetTaskCatalog: unlinkTaskCatalog } : {}) };
    await this.post<void>(TASK_ENDPOINTS.EDIT_TASK_METADATA, camelToPascalCaseKeys(body), { headers });
  }

  @track('Tasks.GetComments')
  async getComments<T extends TaskCommentGetByTaskIdOptions = TaskCommentGetByTaskIdOptions>(
    taskId: number,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskCommentGetResponse>
      : NonPaginatedResponse<TaskCommentGetResponse>
  > {
    if (!taskId) {
      throw new ValidationError({ message: 'taskId is required for getComments' });
    }

    const { folderId, folderKey, folderPath, ...queryOptions } = options ?? {};
    const headers = resolveFolderHeaders({ folderId, folderKey, folderPath, resourceType: 'Tasks.getComments', fallbackFolderKey: this.config.folderKey });

    const transformComment = (comment: unknown) =>
      transformData(pascalToCamelCaseKeys(comment as Record<string, unknown>) as TaskCommentGetResponse, TaskMap);

    const apiOptions = transformOptions(queryOptions, TaskMap);

    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => TASK_NOTE_ENDPOINTS.GET_BY_TASK_ID(taskId),
      headers,
      transformFn: transformComment,
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
    }, apiOptions as T) as any;
  }

  @track('Tasks.CreateComment')
  async createComment(taskId: number, text: string, options?: FolderScopedOptions): Promise<TaskCommentGetResponse> {
    if (!taskId) {
      throw new ValidationError({ message: 'taskId is required for createComment' });
    }
    if (!text) {
      throw new ValidationError({ message: 'text is required for createComment' });
    }

    const headers = this.resolveFolder(options, 'Tasks.createComment');
    const response = await this.post<TaskCommentGetResponse>(
      TASK_NOTE_ENDPOINTS.CREATE,
      camelToPascalCaseKeys({ taskId, text }),
      { headers }
    );
    return transformData(pascalToCamelCaseKeys(response.data) as TaskCommentGetResponse, TaskMap);
  }

  /**
   * Resolves folder scope (folderId, folderKey, or folderPath) into Orchestrator
   * folder headers, falling back to the SDK init-time folder key.
   */
  private resolveFolder(options: FolderScopedOptions | undefined, resourceType: string): Record<string, string> {
    return resolveFolderHeaders({
      folderId: options?.folderId,
      folderKey: options?.folderKey,
      folderPath: options?.folderPath,
      resourceType,
      fallbackFolderKey: this.config.folderKey,
    });
  }

  /**
   * Routes to the type-specific endpoint based on task type.
   */
  private getByTaskType(id: number, folderId: number, taskType: TaskType, options: BaseOptions = {}): Promise<TaskGetResponse> {
    const endpoint = TASK_TYPE_ENDPOINTS[taskType];
    const extraParams: TaskGetFormOptions = taskType === TaskType.Form ? { expandOnFormLayout: true, ...options } : options;
    return this.getTaskByTypeEndpoint(id, folderId, endpoint, extraParams);
  }

  /**
   * Fetches a task from a type-specific endpoint.
   *
   * @param id - The task ID
   * @param folderId - Required folder ID
   * @param endpoint - The type-specific endpoint to call
   * @param extraParams - Additional query parameters (e.g. form options)
   * @returns Promise resolving to the task
   */
  private async getTaskByTypeEndpoint(id: number, folderId: number, endpoint: string, extraParams: TaskGetFormOptions = {}): Promise<TaskGetResponse> {
    const headers = createHeaders({ [FOLDER_ID]: folderId });

    const response = await this.get<TaskGetResponse>(
      endpoint,
      {
        params: {
          taskId: id,
          ...extraParams
        },
        headers
      }
    );
    const transformedTask = transformData(response.data, TaskMap);
    return createTaskWithMethods(
      applyDataTransforms(transformedTask, { field: 'status', valueMap: TaskStatusMap }),
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
    // Add default expand parameters
    const processedOptions = this.addDefaultExpand(options);
    
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

  /**
   * Adds default expand parameters to options
   * @param options - The options object to add default expand to
   * @returns Options with default expand parameters added
   * @private
   */
  private addDefaultExpand<T extends Record<string, any>>(options: T): T {
    const processedOptions: any = { ...options };
    
    processedOptions.expand = processedOptions.expand 
      ? `${DEFAULT_TASK_EXPAND},${processedOptions.expand}`
      : DEFAULT_TASK_EXPAND;
    
    return processedOptions as T;
  }
} 