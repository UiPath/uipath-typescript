import {
  RawCaseInstanceGetResponse,
  CaseInstanceGetAllWithPaginationOptions,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseInstanceReopenOptions,
  CaseGetStageResponse,
  CaseInstanceExecutionHistoryResponse
} from './case-instances.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { OperationResponse } from '../common/types';
import { TaskGetResponse, TaskGetAllOptions } from '../action-center';

/**
 * Service model for managing Maestro Case Instances
 *
 * Maestro case instances are the running instances of Maestro cases.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/)
 *
 * ```typescript
 * import { CaseInstances } from '@uipath/uipath-typescript/cases';
 *
 * const caseInstances = new CaseInstances(sdk);
 * const allInstances = await caseInstances.getAll();
 * ```
 */
export interface CaseInstancesServiceModel {
  /**
   * Get all case instances with optional filtering and pagination
   * 
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise resolving to either an array of case instances NonPaginatedResponse<CaseInstanceGetResponse> or a PaginatedResponse<CaseInstanceGetResponse> when pagination options are used.
   * {@link CaseInstanceGetResponse}
   * @example
   * ```typescript
   * // Get all case instances (non-paginated)
   * const instances = await caseInstances.getAll();
   *
   * // Cancel/Close faulted instances using methods directly on instances
   * for (const instance of instances.items) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.close({ comment: 'Closing faulted case instance' });
   *   }
   * }
   *
   * // With filtering
   * const filteredInstances = await caseInstances.getAll({
   *   processKey: 'MyCaseProcess'
   * });
   *
   * // First page with pagination
   * const page1 = await caseInstances.getAll({ pageSize: 10 });
   *
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await caseInstances.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends CaseInstanceGetAllWithPaginationOptions = CaseInstanceGetAllWithPaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<CaseInstanceGetResponse>
      : NonPaginatedResponse<CaseInstanceGetResponse>
  >;

  /**
   * Get a specific case instance by ID
   * @param instanceId - The case instance ID
   * @param folderKey - Required folder key
   * @returns Promise resolving to case instance with methods
   * {@link CaseInstanceGetResponse}
   * @example
   * ```typescript
   * // Get a specific case instance
   * const instance = await caseInstances.getById(
   *   <instanceId>,
   *   <folderKey>
   * );
   *
   * // Access instance properties
   * console.log(`Status: ${instance.latestRunStatus}`);
   * ```
   */
  getById(instanceId: string, folderKey: string): Promise<CaseInstanceGetResponse>;

  /**
   * Close/Cancel a case instance
   * @param instanceId - The ID of the instance to cancel
   * @param folderKey - Required folder key
   * @param options - Optional close options with comment
   * @returns Promise resolving to operation result with instance data
   * @example
   * ```typescript
   * // Close a case instance
   * const result = await caseInstances.close(
   *   <instanceId>,
   *   <folderKey>
   * );
   *
   * // Or using instance method
   * const instance = await caseInstances.getById(
   *   <instanceId>,
   *   <folderKey>
   * );
   * const result = await instance.close();
   *
   * console.log(`Closed: ${result.success}`);
   *
   * // Close with a comment
   * const resultWithComment = await instance.close({
   *   comment: 'Closing due to invalid input data'
   * });
   *
   * if (resultWithComment.success) {
   *   console.log(`Instance ${resultWithComment.data.instanceId} status: ${resultWithComment.data.status}`);
   * }
   * ```
   */
  close(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Pause a case instance
   * @param instanceId - The ID of the instance to pause
   * @param folderKey - Required folder key
   * @param options - Optional pause options with comment
   * @returns Promise resolving to operation result with instance data
   */
  pause(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Reopen a case instance from a specified element
   * @param instanceId - The ID of the case instance
   * @param folderKey - Required folder key
   * @param options - Reopen options containing stageId (the stage ID to resume from) and an optional comment
   * @returns Promise resolving to operation result with instance data
   * {@link CaseInstanceOperationResponse}
   * @example
   * ```typescript
   * import { CaseInstances } from '@uipath/uipath-typescript/cases';
   *
   * const caseInstances = new CaseInstances(sdk);
   *
   * // First, get the available stages for the case instance
   * const stages = await caseInstances.getStages('<instanceId>', '<folderKey>');
   * const stageId = stages[0].id; // Select the stage to reopen from
   *
   * // Reopen a case instance from a specific stage
   * const result = await caseInstances.reopen(
   *   '<instanceId>',
   *   '<folderKey>',
   *   { stageId }
   * );
   *
   * // Reopen with a comment
   * const result = await caseInstances.reopen(
   *   '<instanceId>',
   *   '<folderKey>',
   *   { stageId, comment: 'Reopening to retry failed stage' }
   * );
   *
   * // Or using instance method
   * const instance = await caseInstances.getById('<instanceId>', '<folderKey>');
   * const stages = await instance.getStages();
   * const result = await instance.reopen({ stageId: stages[0].id });
   * ```
   */
  reopen(instanceId: string, folderKey: string, options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Resume a case instance
   * @param instanceId - The ID of the instance to resume
   * @param folderKey - Required folder key
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result with instance data
   */
  resume(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Get execution history for a case instance
   * @param instanceId - The ID of the case instance
   * @param folderKey - Required folder key 
   * @returns Promise resolving to instance execution history
   * {@link CaseInstanceExecutionHistoryResponse}
   * @example
   * ```typescript
   * // Get execution history for a case instance
   * const history = await caseInstances.getExecutionHistory(
   *   <instanceId>,
   *   <folderKey>
   * );
   *
   * // Access element executions
   * if (history.elementExecutions) {
   *   for (const execution of history.elementExecutions) {
   *     console.log(`Element: ${execution.elementName} - Status: ${execution.status}`);
   *   }
   * }
   * ```
   */
  getExecutionHistory(
    instanceId: string, 
    folderKey: string
  ): Promise<CaseInstanceExecutionHistoryResponse>;

  /**
   * Get stages and its associated tasks information for a case instance 
   * @param caseInstanceId - The ID of the case instance
   * @param folderKey - Required folder key
   * @returns Promise resolving to an array of case stages with their tasks and status
   * @example
   * ```typescript
   * // Get stages for a case instance
   * const stages = await caseInstances.getStages(
   *   <caseInstanceId>,
   *   <folderKey>
   * );
   *
   * // Iterate through stages
   * for (const stage of stages) {
   *   console.log(`Stage: ${stage.name} - Status: ${stage.status}`);
   *
   *   // Check tasks in the stage
   *   for (const taskGroup of stage.tasks) {
   *     for (const task of taskGroup) {
   *       console.log(`  Task: ${task.name} - Status: ${task.status}`);
   *     }
   *   }
   * }
   * ```
   */
  getStages(caseInstanceId: string, folderKey: string): Promise<CaseGetStageResponse[]>;

  /**
   * Get human in the loop tasks associated with a case instance
   * 
   * The method returns either:
   * - An array of tasks (when no pagination parameters are provided)
   * - A paginated result with navigation cursors (when any pagination parameter is provided)
   * 
   * @param caseInstanceId - The ID of the case instance
   * @param options - Optional filtering and pagination options
   * @returns Promise resolving to human in the loop tasks associated with the case instance
   * @example
   * ```typescript
   * // Get all tasks for a case instance (non-paginated)
   * const actionTasks = await caseInstances.getActionTasks(
   *   <caseInstanceId>,
   * );
   *
   * // First page with pagination
   * const page1 = await caseInstances.getActionTasks(
   *   <caseInstanceId>,
   *   { pageSize: 10 }
   * );
   * // Iterate through tasks
   * for (const task of page1.items) {
   *   console.log(`Task: ${task.title}`);
   *   console.log(`Task: ${task.status}`);
   * }
   *
   * // Jump to specific page
   * const page5 = await caseInstances.getActionTasks(
   *   <caseInstanceId>,
   *   {
   *     jumpToPage: 5,
   *     pageSize: 10
   *   }
   * );
   * ```
   */
  getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
    caseInstanceId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;
}

// Method interface that will be added to case instance objects
export interface CaseInstanceMethods {
  /**
   * Closes/cancels this case instance
   * 
   * @param options - Optional close options with comment
   * @returns Promise resolving to operation result
   */
  close(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Pauses this case instance
   *
   * @param options - Optional pause options with comment
   * @returns Promise resolving to operation result
   */
  pause(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Reopens this case instance from a specified element
   *
   * @param options - Reopen options containing stageId (the stage ID to resume from) and an optional comment
   * @returns Promise resolving to operation result
   */
  reopen(options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Resumes this case instance
   *
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result
   */
  resume(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Gets execution history for this case instance
   *
   * @returns Promise resolving to instance execution history
   */
  getExecutionHistory(): Promise<CaseInstanceExecutionHistoryResponse>;

  /**
   * Gets stages and their associated tasks for this case instance
   *
   * @returns Promise resolving to an array of case stages with their tasks and status
   */
  getStages(): Promise<CaseGetStageResponse[]>;

  /**
   * Gets human in the loop tasks associated with this case instance
   *
   * @param options - Optional filtering and pagination options
   * @returns Promise resolving to human in the loop tasks associated with the case instance
   */
  getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskGetResponse>
      : NonPaginatedResponse<TaskGetResponse>
  >;
}

// Combined type for case instance data with methods
export type CaseInstanceGetResponse = RawCaseInstanceGetResponse & CaseInstanceMethods;

/**
 * Creates methods for a case instance
 * 
 * @param instanceData - The case instance data (response from API)
 * @param service - The case instance service instance
 * @returns Object containing case instance methods
 */
function createCaseInstanceMethods(instanceData: RawCaseInstanceGetResponse, service: CaseInstancesServiceModel): CaseInstanceMethods {
  return {
    async close(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');
      
      return service.close(instanceData.instanceId, instanceData.folderKey, options);
    },
    
    async pause(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.pause(instanceData.instanceId, instanceData.folderKey, options);
    },

    async reopen(options: CaseInstanceReopenOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.reopen(instanceData.instanceId, instanceData.folderKey, options);
    },

    async resume(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.resume(instanceData.instanceId, instanceData.folderKey, options);
    },

    async getExecutionHistory(): Promise<CaseInstanceExecutionHistoryResponse> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.getExecutionHistory(instanceData.instanceId, instanceData.folderKey);
    },

    async getStages(): Promise<CaseGetStageResponse[]> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      if (!instanceData.folderKey) throw new Error('Case instance folder key is undefined');

      return service.getStages(instanceData.instanceId, instanceData.folderKey);
    },

    async getActionTasks<T extends TaskGetAllOptions = TaskGetAllOptions>(
      options?: T
    ): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<TaskGetResponse>
        : NonPaginatedResponse<TaskGetResponse>
    > {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');

      return service.getActionTasks(instanceData.instanceId, options);
    }
  };
}

/**
 * Creates an actionable case instance by combining API case instance data with operational methods.
 * 
 * @param instanceData - The case instance data from API
 * @param service - The case instance service instance
 * @returns A case instance object with added methods
 */
export function createCaseInstanceWithMethods(
  instanceData: RawCaseInstanceGetResponse, 
  service: CaseInstancesServiceModel
): CaseInstanceGetResponse {
  const methods = createCaseInstanceMethods(instanceData, service);
  return Object.assign({}, instanceData, methods) as CaseInstanceGetResponse;
}