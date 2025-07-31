/**
 * Process Instance Models
 * Model classes for Maestro process instances
 */

import {
  ProcessInstanceGetResponse,
  ProcessInstanceOperationRequest,
  ProcessInstanceGetAllOptions,
} from './process-instance.types';
import { ProcessInstancesService } from '../../services/maestro/process-instances';

/**
 * Collection class for managing process instances for a specific process
 */
export class ProcessInstancesCollection {
  constructor(
    private readonly processKey: string,
    private readonly folderKey: string,
    private readonly service: ProcessInstancesService
  ) {}

  /**
   * Get all instances for this process
   * @param options Additional filtering options
   * @returns Promise resolving to array of ProcessInstance objects
   * 
   * @example
   * ```typescript
   * const instances = await process.instances.getAll();
   * const runningInstances = await process.instances.getAll({ status: 'Running' });
   * ```
   */
  async getAll(options?: ProcessInstanceGetAllOptions): Promise<ProcessInstance[]> {
    const params = {
      ...options,
      processKey: this.processKey
    };
    return this.service.getAll(params);
  }

  /**
   * Get a specific instance by ID
   * @param instanceId The ID of the instance to retrieve
   * @returns Promise resolving to ProcessInstance object
   * 
   * @example
   * ```typescript
   * const instance = await process.instances.getById('instance-123');
   * await instance.cancel('No longer needed');
   * ```
   */
  async getById(instanceId: string): Promise<ProcessInstance> {
    return this.service.getById(instanceId, this.folderKey);
  }
}

/**
 * Service interface that ProcessInstance class depends on
 * This allows the class to call service methods
 */
export interface ProcessInstanceServiceModel {
  getById(instanceId: string, folderKey: string): Promise<ProcessInstance>;
  getExecutionHistory(instanceId: string): Promise<any[]>;
  getBpmn(instanceId: string, folderKey: string): Promise<string>;
  cancel(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
  pause(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
  resume(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
}

/**
 * ProcessInstance class providing a rich object model for process instances
 * Uses interface declaration merging to avoid property duplication
 */
export interface ProcessInstance extends ProcessInstanceGetResponse {}

export class ProcessInstance {
  constructor(
    data: ProcessInstanceGetResponse,
    private readonly service: ProcessInstanceServiceModel
  ) {
    // Copy all fields from data to this instance
    Object.assign(this, data);
  }

  /**
   * Cancels this process instance
   * 
   * @param comment Optional comment for the cancellation
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Cancel with comment
   * await instance.cancel('Cancelled due to timeout');
   * 
   * // Cancel without comment
   * await instance.cancel();
   * ```
   */
  async cancel(comment?: string): Promise<void> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    await this.service.cancel(this.instanceId, this.folderKey, comment ? { comment } : {});
  }

  /**
   * Pauses this process instance
   * 
   * @param comment Optional comment for the pause
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Pause with comment
   * await instance.pause('Pausing for maintenance');
   * 
   * // Pause without comment
   * await instance.pause();
   * ```
   */
  async pause(comment?: string): Promise<void> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    await this.service.pause(this.instanceId, this.folderKey, comment ? { comment } : {});
  }

  /**
   * Resumes this process instance
   * 
   * @param comment Optional comment for the resume
   * @returns Promise resolving to void
   * 
   * @example
   * ```typescript
   * // Resume with comment
   * await instance.resume('Resuming after maintenance');
   * 
   * // Resume without comment
   * await instance.resume();
   * ```
   */
  async resume(comment?: string): Promise<void> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    await this.service.resume(this.instanceId, this.folderKey, comment ? { comment } : {});
  }

  /**
   * Gets execution history for this process instance
   * 
   * @returns Promise resolving to execution history
   * 
   * @example
   * ```typescript
   * const history = await instance.getExecutionHistory();
   * ```
   */
  async getExecutionHistory(): Promise<any[]> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    return this.service.getExecutionHistory(this.instanceId);
  }

  /**
   * Gets BPMN XML for this process instance
   * 
   * @returns Promise resolving to BPMN XML string
   * 
   * @example
   * ```typescript
   * const bpmn = await instance.getBpmn();
   * ```
   */
  async getBpmn(): Promise<string> {
    if (!this.instanceId) throw new Error('Instance ID is null');
    return this.service.getBpmn(this.instanceId, this.folderKey);
  }

}