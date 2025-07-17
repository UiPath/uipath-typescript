import { BaseService } from '../baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { 
  ActionCreateRequest, 
  ActionCreateResponse, 
  ActionGetResponse, 
  ActionAssignmentRequest,
  ActionsAssignRequest,
  ActionsUnassignRequest,
  ActionAssignmentResult,
  ActionAssignmentResultCollection,
  ActionCompletionRequest,
  ActionType
} from '../../models/actions/actions.types';
import {
  Action,
  ActionServiceModel
} from '../../models/actions/actions.model';
import { FOLDER_ID } from '../../utils/constants/headers';
import { pascalToCamelCaseKeys, camelToPascalCaseKeys, transformData, transformApiResponse } from '../../utils/transform';
import { ActionStatusMap, ActionTimeMap } from '../../models/actions/actions.fieldMaps';
import { CollectionResponse } from '../../models/common/commonTypes';

/**
 * Service for interacting with UiPath Actions API
 */
export class ActionService extends BaseService implements ActionServiceModel {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Creates headers object with folder ID if provided
   * @param folderId - Optional folder/organization unit ID
   * @returns Headers object with folder ID if provided
   * @private
   */
  private createHeaders(folderId?: number): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (folderId !== undefined) {
      headers[FOLDER_ID] = folderId.toString();
    }
    
    return headers;
  }

  /**
   * Creates a new action
   * @param action - The action to be created
   * @param folderId - Required folder/organization unit ID
   * @returns Promise resolving to the created action
   * 
   * @example
   * ```typescript
   * const action = await sdk.action.create({
   *   title: "My Action",
   *   priority: ActionPriority.Medium,
   *   data: { key: "value" }
   * }, 123); // folderId is required
   * ```
   */
  async create(action: ActionCreateRequest, folderId: number): Promise<Action> {
    const headers = this.createHeaders(folderId);
    
    const externalTask = {
      ...action,
      type: ActionType.External //currently only external action is supported
    };
    
    const response = await this.post<ActionCreateResponse>(
      '/tasks/GenericTasks/CreateTask',
      externalTask,
      { headers }
    );
    // Transform time fields for consistency
    const normalizedData = transformData(response.data, ActionTimeMap);
    return new Action(
      transformApiResponse(normalizedData, { field: 'status', valueMap: ActionStatusMap }),
      this
    );
  }

  /**
   * Gets actions across folders with optional query parameters
   * 
   * @param options - Query options
   * @param folderId - Optional folder/organization unit ID
   * @returns Promise resolving to an array of actions
   * 
   * @example
   * ```typescript
   * // Get all actions
   * const actions = await sdk.action.getAll();
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
  } = {}, folderId?: number): Promise<Action[]> {
    const headers = this.createHeaders(folderId);
    
    const response = await this.get<CollectionResponse<ActionGetResponse>>(
      '/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders',
      { 
        params: options,
        headers
      }
    );
    
    // Transform response Action array from PascalCase to camelCase and normalize time fields
    const transformedActions = response.data.value.map(action => 
      transformData(pascalToCamelCaseKeys(action) as ActionGetResponse, ActionTimeMap)
    );
    
    return transformedActions.map(action => 
      new Action(
        transformApiResponse(action, { field: 'status', valueMap: ActionStatusMap }),
        this
      )
    );
  }

  /**
   * Gets an action by ID
   * 
   * @param id - The ID of the action to retrieve
   * @param options - Optional query parameters
   * @param folderId - Optional folder/organization unit ID
   * @returns Promise resolving to the action
   * 
   * @example
   * ```typescript
   * // Get action by ID
   * const action = await sdk.action.getById(123);
   * ```
   */
  async getById(id: number, options: {
    $expand?: string;
    $select?: string;
  } = {}, folderId?: number): Promise<Action> {
    const headers = this.createHeaders(folderId);
    
    const response = await this.get<ActionGetResponse>(
      `/odata/Tasks(${id})`,
      { 
        params: options,
        headers
      }
    );
    
    // Transform response from PascalCase to camelCase and normalize time fields
    const transformedAction = transformData(pascalToCamelCaseKeys(response.data) as ActionGetResponse, ActionTimeMap);
    
    return new Action(
      transformApiResponse(transformedAction, { field: 'status', valueMap: ActionStatusMap }),
      this
    );
  }

  /**
   * Assigns actions to users
   * 
   * @param taskAssignments - Single action assignment or array of action assignments
   * @param folderId - Optional folder/organization unit ID
   * @returns Promise resolving to array of action assignment results
   * 
   * @example
   * ```typescript
   * // Assign a single action to a user by ID
   * const result = await sdk.action.assign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Assign a single action to a user by email
   * const result = await sdk.action.assign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Assign multiple actions
   * const result = await sdk.action.assign([
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
  async assign(actionAssignments: ActionAssignmentRequest | ActionAssignmentRequest[], folderId?: number): Promise<ActionAssignmentResult[]> {
    const headers = this.createHeaders(folderId);
    
    const request: ActionsAssignRequest = {
      taskAssignments: Array.isArray(actionAssignments) ? actionAssignments : [actionAssignments]
    };
    
    // Convert request to PascalCase for API
    const pascalRequest = camelToPascalCaseKeys(request);
    
    const response = await this.post<ActionAssignmentResultCollection>(
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
   * Reassigns actions to new users
   * 
   * @param actionAssignments - Single action assignment or array of action assignments
   * @param folderId - Optional folder/organization unit ID
   * @returns Promise resolving to array of action assignment results
   * 
   * @example
   * ```typescript
   * // Reassign a single action to a user by ID
   * const result = await sdk.action.reassign({
   *   taskId: 123,
   *   userId: 456
   * });
   * 
   * // Reassign a single action to a user by email
   * const result = await sdk.action.reassign({
   *   taskId: 123,
   *   userNameOrEmail: "user@example.com"
   * });
   * 
   * // Reassign multiple actions
   * const result = await sdk.action.reassign([
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
  async reassign(actionAssignments: ActionAssignmentRequest | ActionAssignmentRequest[], folderId?: number): Promise<ActionAssignmentResult[]> {
    const headers = this.createHeaders(folderId);
    
    const request: ActionsAssignRequest = {
      taskAssignments: Array.isArray(actionAssignments) ? actionAssignments : [actionAssignments]
    };
    
    // Convert request to PascalCase for API
    const pascalRequest = camelToPascalCaseKeys(request);
    
    const response = await this.post<ActionAssignmentResultCollection>(
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
   * Unassigns actions (removes current assignees)
   * 
   * @param actionIds - Single action ID or array of action IDs to unassign
   * @param folderId - Optional folder/organization unit ID
   * @returns Promise resolving to array of action assignment results
   * 
   * @example
   * ```typescript
   * // Unassign a single action
   * const result = await sdk.action.unassign(123);
   * 
   * // Unassign multiple actions
   * const result = await sdk.action.unassign([123, 456, 789]);
   * ```
   */
  async unassign(actionIds: number | number[], folderId?: number): Promise<ActionAssignmentResult[]> {
    const headers = this.createHeaders(folderId);
    
    const request: ActionsUnassignRequest = {
      taskIds: Array.isArray(actionIds) ? actionIds : [actionIds]
    };
    
    const response = await this.post<ActionAssignmentResultCollection>(
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
   * Completes an action with the specified type and data
   * 
   * @param completionType - The type of action (Form, App, or Generic)
   * @param request - The completion request data
   * @param folderId - Required folder/organization unit ID
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Complete an app action
   * await sdk.action.complete(ActionType.App, {
   *   taskId: 456,
   *   data: {},
   *   action: "submit"
   * }, 123); // folderId is required
   * 
   * // Complete an external action
   * await sdk.action.complete(ActionType.ExternalTask, {
   *   taskId: 789
   * }, 123); // folderId is required
   * ```
   */
  async complete(completionType: ActionType, request: ActionCompletionRequest, folderId: number): Promise<void> {
    const headers = this.createHeaders(folderId);
    
    let endpoint: string;
    
    switch (completionType) {
      case ActionType.Form:
        endpoint = '/forms/TaskForms/CompleteTask';
        break;
      case ActionType.App:
        endpoint = '/tasks/AppTasks/CompleteAppTask';
        break;
      default:
        endpoint = '/tasks/GenericTasks/CompleteTask';
        break;
    }
    
    await this.post<void>(endpoint, request, { headers });
  }
} 