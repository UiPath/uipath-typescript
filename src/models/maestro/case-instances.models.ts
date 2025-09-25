import { 
  RawCaseInstanceGetResponse,
  CaseInstanceGetAllWithPaginationOptions,
  CaseInstanceOperationOptions,
  CaseInstanceOperationResponse,
  CaseGetStageResponse
} from './case-instances.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';
import { OperationResponse } from '../common/types';

/**
 * Service model for managing Maestro Case Instances
 * 
 * Maestro case instances are the running instances of Maestro cases.
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
   * const instances = await sdk.maestro.cases.instances.getAll();
   * 
   * // Cancel/Close faulted instances using methods directly on instances
   * for (const instance of instances.items) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.close({ comment: 'Closing faulted case instance' });
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.maestro.cases.instances.getAll({
   *   processKey: 'MyCaseProcess'
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.maestro.cases.instances.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.maestro.cases.instances.getAll({ cursor: page1.nextCursor });
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
   * const instance = await sdk.maestro.cases.instances.getById(
   *   <instanceId>,
   *   <folderKey>
   * );
   * 
   * // Access instance properties
   * console.log(`Status: ${instance.latestRunStatus}`);
   * 
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
   * const result = await sdk.maestro.cases.instances.close(
   *   <instanceId>,
   *   <folderKey>
   * );
   * 
   * if (result.success) {
   *   console.log(`Instance ${result.data.instanceId} now has status: ${result.data.status}`);
   * }
   * 
   * // Close with a comment
   * const result = await sdk.maestro.cases.instances.close(
   *   <instanceId>,
   *   <folderKey>,
   *   { comment: <comment> }
   * );
   * 
   * // Close multiple faulted instances
   * const instances = await sdk.maestro.cases.instances.getAll({
   *   latestRunStatus: "Faulted"
   * });
   * 
   * for (const instance of instances.items) {
   *   const result = await sdk.maestro.cases.instances.close(
   *     instance.instanceId,
   *     instance.folderKey,
   *     { comment: <comment> }
   *   );
   *   
   *   if (result.success) {
   *     console.log(`Closed instance: ${result.data.instanceId}`);
   *   }
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
   * Resume a case instance
   * @param instanceId - The ID of the instance to resume
   * @param folderKey - Required folder key
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result with instance data
   */
  resume(instanceId: string, folderKey: string, options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;

  /**
   * Get stages and its associated tasks information for a case instance 
   * @param caseInstanceId - The ID of the case instance
   * @param folderKey - Required folder key
   * @returns Promise resolving to an array of case stages with their tasks and status
   * @example
   * ```typescript
   * // Get stages for a case instance
   * const stages = await sdk.maestro.cases.instances.getStages(
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
   * Resumes this case instance
   * 
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result
   */
  resume(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>>;
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
      
      return service.close(instanceData.instanceId, instanceData.folderKey, options);
    },
    
    async pause(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      
      return service.pause(instanceData.instanceId, instanceData.folderKey, options);
    },

    async resume(options?: CaseInstanceOperationOptions): Promise<OperationResponse<CaseInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Case instance ID is undefined');
      
      return service.resume(instanceData.instanceId, instanceData.folderKey, options);
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