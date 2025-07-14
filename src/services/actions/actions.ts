import { BaseService } from '../baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { 
  TaskCreateRequest, 
  TaskDataDto, 
  TaskDto, 
  ODataResponse, 
  Task,
  TaskAssignmentRequest,
  TasksAssignRequest,
  TasksDeleteRequest,
  TaskOperationErrorResponse,
  ODataValueOfTaskOperationErrorResponse,
  TaskCompletionRequest,
  TaskType
} from '../../models/actions/task';
import { ORGANIZATION_UNIT_ID } from '../../utils/constants/headers';
import { pascalToCamelCaseKeys, camelToPascalCaseKeys } from '../../utils/transform';

/**
 * Service for interacting with UiPath Actions API
 */
export class ActionsService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Creates a new task
   * @param task - The task to be created
   * @param organizationUnitId - Required folder/organization unit ID
   * @returns Promise resolving to the created task
   * 
   * @example
   * ```typescript
   * const task = await sdk.actions.create({
   *   title: "My Task",
   *   type: TaskType.ExternalTask,
   *   priority: TaskPriority.Medium,
   *   data: { key: "value" }
   * }, 123); // organizationUnitId is required
   * ```
   */
  async create(task: TaskCreateRequest, organizationUnitId: number): Promise<Task> {
    const headers: Record<string, string> = {};
    
    headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    
    const response = await this.post<TaskDataDto>(
      '/tasks/GenericTasks/CreateTask',
      task,
      { headers }
    );
    
    return Task.fromDto(response.data, this, organizationUnitId);
  }

  /**
   * Gets tasks across folders with optional OData parameters
   * 
   * @param options - OData query options
   * @param organizationUnitId - Optional folder/organization unit ID
   * @returns Promise resolving to an array of tasks
   * 
   * @example
   * ```typescript
   * // Get all tasks
   * const tasks = await sdk.actions.getAll();
   * ```
   */
  async getAll(options: {
    event?: 'ForwardedEver';
    $expand?: string;
    $filter?: string;
    $select?: string;
    $orderby?: string;
    $top?: number;
    $skip?: number;
    $count?: boolean;
  } = {}, organizationUnitId?: number): Promise<Task[]> {
    const headers: Record<string, string> = {};
    
    if (organizationUnitId) {
      headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    }
    
    const response = await this.get<ODataResponse<TaskDto>>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders',
      { 
        params: options,
        headers
      }
    );
    
    // Transform response TaskDto array from PascalCase to camelCase
    const transformedTasks = response.data.value.map(task => 
      pascalToCamelCaseKeys(task) as TaskDto
    );
    
    return transformedTasks.map(task => Task.fromDto(task, this, organizationUnitId));
  }

  /**
   * Gets a task by ID
   * 
   * @param id - The ID of the task to retrieve
   * @param options - Optional OData parameters
   * @param organizationUnitId - Optional folder/organization unit ID
   * @returns Promise resolving to the task
   * 
   * @example
   * ```typescript
   * // Get task by ID
   * const task = await sdk.actions.getById(123);
   * ```
   */
  async getById(id: number, options: {
    $expand?: string;
    $select?: string;
  } = {}, organizationUnitId?: number): Promise<Task> {
    const headers: Record<string, string> = {};
    
    if (organizationUnitId) {
      headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    }
    
    const response = await this.get<TaskDto>(
      `/odata/Tasks(${id})`,
      { 
        params: options,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedTask = pascalToCamelCaseKeys(response.data) as TaskDto;
    
    return Task.fromDto(transformedTask, this, organizationUnitId);
  }

  /**
   * Assigns tasks to users
   * 
   * @param taskAssignments - Single task assignment or array of task assignments
   * @param organizationUnitId - Optional folder/organization unit ID
   * @returns Promise resolving to array of task operation error responses
   * 
   * @example
   * ```typescript
   * // Assign a single task to a user by ID
   * const result = await sdk.actions.assign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Assign a single task to a user by email
   * const result = await sdk.actions.assign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Assign multiple tasks
   * const result = await sdk.actions.assign([
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
  async assign(taskAssignments: TaskAssignmentRequest | TaskAssignmentRequest[], organizationUnitId?: number): Promise<TaskOperationErrorResponse[]> {
    const headers: Record<string, string> = {};
    
    if (organizationUnitId) {
      headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    }
    
    const request: TasksAssignRequest = {
      taskAssignments: Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments]
    };
    
    // Convert request to PascalCase for API
    const pascalRequest = camelToPascalCaseKeys(request);
    
    const response = await this.post<ODataValueOfTaskOperationErrorResponse>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.AssignTasks',
      pascalRequest,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as ODataValueOfTaskOperationErrorResponse;
    
    return transformedResponse.value;
  }

  /**
   * Reassigns tasks to users (transfers tasks from current assignees to new users)
   * 
   * @param taskAssignments - Single task assignment or array of task assignments
   * @param organizationUnitId - Optional folder/organization unit ID
   * @returns Promise resolving to array of task operation error responses
   * 
   * @example
   * ```typescript
   * // Reassign a single task to a user by ID
   * const result = await sdk.actions.reassign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Reassign a single task to a user by email
   * const result = await sdk.actions.reassign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Reassign multiple tasks
   * const result = await sdk.actions.reassign([
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
  async reassign(taskAssignments: TaskAssignmentRequest | TaskAssignmentRequest[], organizationUnitId?: number): Promise<TaskOperationErrorResponse[]> {
    const headers: Record<string, string> = {};
    
    if (organizationUnitId) {
      headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    }
    
    const request: TasksAssignRequest = {
      taskAssignments: Array.isArray(taskAssignments) ? taskAssignments : [taskAssignments]
    };
    
    // Convert request to PascalCase for API
    const pascalRequest = camelToPascalCaseKeys(request);
    
    const response = await this.post<ODataValueOfTaskOperationErrorResponse>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.ReassignTasks',
      pascalRequest,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as ODataValueOfTaskOperationErrorResponse;
    
    return transformedResponse.value;
  }

  /**
   * Unassigns tasks (removes current assignees)
   * 
   * @param taskIds - Single task ID or array of task IDs to unassign
   * @param organizationUnitId - Optional folder/organization unit ID
   * @returns Promise resolving to array of task operation error responses
   * 
   * @example
   * ```typescript
   * // Unassign a single task
   * const result = await sdk.actions.unassign(123);
   * 
   * // Unassign multiple tasks
   * const result = await sdk.actions.unassign([123, 456, 789]);
   * ```
   */
  async unassign(taskIds: number | number[], organizationUnitId?: number): Promise<TaskOperationErrorResponse[]> {
    const headers: Record<string, string> = {};
    
    if (organizationUnitId) {
      headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    }
    
    const request: TasksDeleteRequest = {
      taskIds: Array.isArray(taskIds) ? taskIds : [taskIds]
    };
    
    const response = await this.post<ODataValueOfTaskOperationErrorResponse>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.UnassignTasks',
      request,
      { headers }
    );
    
    // Transform response from PascalCase to camelCase
    const transformedResponse = pascalToCamelCaseKeys(response.data) as ODataValueOfTaskOperationErrorResponse;
    
    return transformedResponse.value;
  }

  /**
   * Completes a task with the specified type and data
   * 
   * @param completionType - The type of task (Form, App, or Generic)
   * @param request - The completion request data
   * @param organizationUnitId - Required folder/organization unit ID
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Complete an app task
   * await sdk.actions.complete(TaskType.AppTask, {
   *   taskId: 456,
   *   data: {},
   *   action: "submit"
   * }, 123); // organizationUnitId is required
   * 
   * // Complete a generic task
   * await sdk.actions.complete(TaskType.ExternalTask, {
   *   taskId: 789
   * }, 123); // organizationUnitId is required
   * ```
   */
  async complete(completionType: TaskType, request: TaskCompletionRequest, organizationUnitId: number): Promise<void> {
    const headers: Record<string, string> = {};
    
    headers[ORGANIZATION_UNIT_ID] = organizationUnitId.toString();
    
    let endpoint: string;
    
    switch (completionType) {
      case TaskType.FormTask:
        endpoint = '/forms/TaskForms/CompleteTask';
        break;
      case TaskType.AppTask:
        endpoint = '/tasks/AppTasks/CompleteAppTask';
        break;
      default:
        endpoint = '/tasks/GenericTasks/CompleteTask';
        break;
    }
    
    await this.post<void>(endpoint, request, { headers });
  }
} 