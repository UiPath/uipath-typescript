import type {
  RawProcessInstanceGetResponse,
  ProcessInstanceGetAllWithPaginationOptions,
  ProcessInstanceOperationOptions,
  ProcessInstanceOperationResponse,
  ProcessInstanceExecutionHistoryResponse,
  BpmnXmlString
} from './process-instances.types';
import { OperationResponse } from '../common/types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for managing UiPath Maestro Process instances
 * 
 * Maestro process instances are the running instances of Maestro processes. [UiPath Maestro Process Instances Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/all-instances-view)
 */
export interface ProcessInstancesServiceModel {
  /**
   * Get all process instances with optional filtering and pagination
   * 
   * The method returns either:
   * - A NonPaginatedResponse with items array (when no pagination parameters are provided)
   * - A PaginatedResponse with navigation cursors (when any pagination parameter is provided)
   * 
   * @param options Query parameters for filtering instances and pagination
   * @returns Promise resolving to either an array of process instances NonPaginatedResponse<ProcessInstanceGetResponse> or a PaginatedResponse<ProcessInstanceGetResponse> when pagination options are used.
   * {@link ProcessInstanceGetResponse}
   * @example
   * ```typescript
   * // Get all instances (non-paginated)
   * const instances = await sdk.maestro.processes.instances.getAll();
   * 
   * // Cancel faulted instances using methods directly on instances
   * for (const instance of instances.items) {
   *   if (instance.latestRunStatus === 'Faulted') {
   *     await instance.cancel({ comment: 'Cancelling faulted instance' });
   *   }
   * }
   * 
   * // With filtering
   * const instances = await sdk.maestro.processes.instances.getAll({
   *   processKey: 'MyProcess'
   * });
   * 
   * // First page with pagination
   * const page1 = await sdk.maestro.processes.instances.getAll({ pageSize: 10 });
   * 
   * // Navigate using cursor
   * if (page1.hasNextPage) {
   *   const page2 = await sdk.maestro.processes.instances.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends ProcessInstanceGetAllWithPaginationOptions = ProcessInstanceGetAllWithPaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<ProcessInstanceGetResponse>
      : NonPaginatedResponse<ProcessInstanceGetResponse>
  >;

  /**
   * Get a process instance by ID with operation methods (cancel, pause, resume)
   * @param id The ID of the instance to retrieve
   * @param folderKey The folder key for authorization
   * @returns Promise resolving to a process instance
   * {@link ProcessInstanceGetResponse}
   * @example
   * ```typescript
   * // Get a specific process instance
   * const instance = await sdk.maestro.processes.instances.getById(
   *   <instanceId>,
   *   <folderKey>
   * );
   * 
   * // Access instance properties
   * console.log(`Status: ${instance.latestRunStatus}`);
   * 
   * ```
   */
  getById(id: string, folderKey: string): Promise<ProcessInstanceGetResponse>;

  /**
   * Get execution history (spans) for a process instance
   * @param instanceId The ID of the instance to get history for
   * @returns Promise resolving to execution history
   * {@link ProcessInstanceExecutionHistoryResponse}
   * @example
   * ```typescript
   * // Get execution history for a process instance
   * const history = await sdk.maestro.processes.instances.getExecutionHistory(
   *   <instanceId>
   * );
   * 
   * // Analyze execution timeline
   * history.forEach(span => {
   *   console.log(`Activity: ${span.name}`);
   *   console.log(`Start: ${span.startTime}`);
   *   console.log(`Duration: ${span.duration}ms`);
   * });
   * 
   * ```
   */
  getExecutionHistory(instanceId: string): Promise<ProcessInstanceExecutionHistoryResponse[]>;

  /**
   * Get BPMN XML file for a process instance
   * @param instanceId The ID of the instance to get BPMN for
   * @param folderKey The folder key for authorization
   * @returns Promise resolving to BPMN XML file
   * {@link BpmnXmlString}
   * @example
   * ```typescript
   * // Get BPMN XML for a process instance
   * const bpmnXml = await sdk.maestro.processes.instances.getBpmn(
   *   <instanceId>,
   *   <folderKey>
   * );
   * 
   * // Render BPMN diagram in frontend using bpmn-js
   * import BpmnViewer from 'bpmn-js/lib/Viewer';
   * 
   * const viewer = new BpmnViewer({
   *   container: '#bpmn-diagram'
   * });
   * 
   * await viewer.importXML(bpmnXml);
   * 
   * // Zoom to fit the diagram
   * viewer.get('canvas').zoom('fit-viewport');
   * ```
   */
  getBpmn(instanceId: string, folderKey: string): Promise<BpmnXmlString>;

  /**
   * Cancel a process instance
   * @param instanceId The ID of the instance to cancel
   * @param folderKey The folder key for authorization
   * @param options Optional cancellation options with comment
   * @returns Promise resolving to operation result with instance data
   * @example
   * ```typescript
   * // Cancel a process instance
   * const result = await sdk.maestro.processes.instances.cancel(
   *   <instanceId>,
   *   <folderKey>
   * );
   * 
   * if (result.success) {
   *   console.log(`Instance ${result.data.instanceId} now has status: ${result.data.status}`);
   * }
   * 
   * // Cancel with a comment
   * const result = await sdk.maestro.processes.instances.cancel(
   *   <instanceId>,
   *   <folderKey>,
   *   { comment: <comment> }
   * );
   * 
   * // Cancel multiple faulted instances
   * const instances = await sdk.maestro.processes.instances.getAll({
   *   latestRunStatus: "Faulted"
   * });
   * 
   * for (const instance of instances.items) {
   *   const result = await sdk.maestro.processes.instances.cancel(
   *     instance.instanceId,
   *     instance.folderKey,
   *     { comment: <comment> }
   *   );
   *   
   *   if (result.success) {
   *     console.log(`Cancelled instance: ${result.data.instanceId}`);
   *   }
   * }
   * ```
   */
  cancel(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>>;

  /**
   * Pause a process instance
   * @param instanceId The ID of the instance to pause
   * @param folderKey The folder key for authorization
   * @param options Optional pause options with comment
   * @returns Promise resolving to operation result with instance data
   */
  pause(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>>

  /**
   * Resume a process instance
   * @param instanceId The ID of the instance to resume
   * @param folderKey The folder key for authorization
   * @param options Optional resume options with comment
   * @returns Promise resolving to operation result with instance data
   */
  resume(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>>;
}

// Method interface that will be added to process instance objects
export interface ProcessInstanceMethods {
  /**
   * Cancels this process instance
   * 
   * @param options - Optional cancellation options with comment
   * @returns Promise resolving to operation result
   */
  cancel(options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>>;

  /**
   * Pauses this process instance
   * 
   * @param options - Optional pause options with comment
   * @returns Promise resolving to operation result
   */
  pause(options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>>;

  /**
   * Resumes this process instance
   * 
   * @param options - Optional resume options with comment
   * @returns Promise resolving to operation result
   */
  resume(options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>>;
}

// Combined type for process instance data with methods
export type ProcessInstanceGetResponse = RawProcessInstanceGetResponse & ProcessInstanceMethods;

/**
 * Creates methods for a process instance
 * 
 * @param instanceData - The process instance data (response from API)
 * @param service - The process instance service instance
 * @returns Object containing process instance methods
 */
function createProcessInstanceMethods(instanceData: RawProcessInstanceGetResponse, service: ProcessInstancesServiceModel): ProcessInstanceMethods {
  return {
    async cancel(options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Process instance ID is undefined');
      
      return service.cancel(instanceData.instanceId, instanceData.folderKey, options);
    },
    
    async pause(options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Process instance ID is undefined');
      
      return service.pause(instanceData.instanceId, instanceData.folderKey, options);
    },

    async resume(options?: ProcessInstanceOperationOptions): Promise<OperationResponse<ProcessInstanceOperationResponse>> {
      if (!instanceData.instanceId) throw new Error('Process instance ID is undefined');
      
      return service.resume(instanceData.instanceId, instanceData.folderKey, options);
    }
  };
}

/**
 * Creates an actionable process instance by combining API process instance data with operational methods.
 * 
 * @param instanceData - The process instance data from API
 * @param service - The process instance service instance
 * @returns A process instance object with added methods
 */
export function createProcessInstanceWithMethods(
  instanceData: RawProcessInstanceGetResponse, 
  service: ProcessInstancesServiceModel
): ProcessInstanceGetResponse {
  const methods = createProcessInstanceMethods(instanceData, service);
  return Object.assign({}, instanceData, methods) as ProcessInstanceGetResponse;
}