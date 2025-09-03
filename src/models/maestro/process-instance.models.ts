/**
 * Process Instance Models
 * Model classes for Maestro process instances
 */

import type {
  RawProcessInstanceGetResponse,
  ProcessInstanceGetAllOptions,
  ProcessInstanceOperationOptions,
  ProcessInstanceExecutionHistoryResponse,
  BpmnXmlString
} from './process-instance.types';

/**
 * Service interface for ProcessInstancesService
 * Defines the contract that the service must implement
 */
export interface ProcessInstancesServiceModel {
  getAll(options?: ProcessInstanceGetAllOptions): Promise<ProcessInstanceGetResponse[]>;
  getById(id: string, folderKey: string): Promise<ProcessInstanceGetResponse>;
  getExecutionHistory(instanceId: string): Promise<ProcessInstanceExecutionHistoryResponse[]>;
  getBpmn(instanceId: string, folderKey: string): Promise<BpmnXmlString>;
  cancel(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void>;
  pause(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void>;
  resume(instanceId: string, folderKey: string, options?: ProcessInstanceOperationOptions): Promise<void>;
}

// Method interface that will be added to process instance objects
export interface ProcessInstanceMethods {
  /**
   * Cancels this process instance
   * 
   * @param options - Optional cancellation options with comment
   * @returns Promise resolving to void
   */
  cancel(options?: ProcessInstanceOperationOptions): Promise<void>;

  /**
   * Pauses this process instance
   * 
   * @param options - Optional pause options with comment
   * @returns Promise resolving to void
   */
  pause(options?: ProcessInstanceOperationOptions): Promise<void>;

  /**
   * Resumes this process instance
   * 
   * @param options - Optional resume options with comment
   * @returns Promise resolving to void
   */
  resume(options?: ProcessInstanceOperationOptions): Promise<void>;
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
    async cancel(options?: ProcessInstanceOperationOptions): Promise<void> {
      if (!instanceData.instanceId) throw new Error('Process instance ID is undefined');
      
      return service.cancel(instanceData.instanceId, instanceData.folderKey, options);
    },
    
    async pause(options?: ProcessInstanceOperationOptions): Promise<void> {
      if (!instanceData.instanceId) throw new Error('Process instance ID is undefined');
      
      return service.pause(instanceData.instanceId, instanceData.folderKey, options);
    },

    async resume(options?: ProcessInstanceOperationOptions): Promise<void> {
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