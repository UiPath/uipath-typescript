/**
 * Process Instance Models
 * Model classes for Maestro process instances
 */

import {
  ProcessInstanceGetResponse,
  ProcessInstanceGetAllOptions,
  ProcessInstanceOperationRequest,
  ProcessInstanceExecutionHistoryResponse
} from './process-instance.types';

/**
 * Service interface for ProcessInstancesService
 * Defines the contract that the service must implement
 */
export interface ProcessInstancesServiceModel {
  getAll(options?: ProcessInstanceGetAllOptions): Promise<ProcessInstanceGetResponse[]>;
  getById(id: string, folderKey: string): Promise<ProcessInstanceGetResponse>;
  getExecutionHistory(instanceId: string): Promise<ProcessInstanceExecutionHistoryResponse[]>;
  getBpmn(instanceId: string, folderKey: string): Promise<string>;
  cancel(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
  pause(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
  resume(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
}