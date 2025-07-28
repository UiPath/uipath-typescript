/**
 * Process Instance Models
 * Model classes for Maestro process instances
 */

import {
  ProcessInstanceGetResponse,
  ProcessInstanceOperationRequest
} from './process-instance.types';

/**
 * Service interface that ProcessInstance class depends on
 * This allows the class to call service methods
 */
export interface ProcessInstanceServiceModel {
  cancel(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
  pause(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
  resume(instanceId: string, folderKey: string, request?: ProcessInstanceOperationRequest): Promise<void>;
}

/**
 * ProcessInstance class providing a rich object model for process instances
 * Similar to the Task class pattern
 */
export class ProcessInstance {
  constructor(
    private readonly _data: ProcessInstanceGetResponse,
    private readonly service: ProcessInstanceServiceModel,
  ) {}

  // Core instance properties
  get id(): string | null {
    return this._data.instanceId;
  }

  get folderKey(): string {
    return this._data.folderKey;
  }

  get processKey(): string | null {
    return this._data.processKey;
  }

  get displayName(): string | null {
    return this._data.instanceDisplayName;
  }

  get startTime(): string {
    return this._data.startedTimeUtc;
  }

  get createdTime(): string {
    return this._data.startedTimeUtc;
  }

  get completedTime(): string | null {
    return this._data.completedTimeUtc;
  }
  // Access to raw instance data
  get data(): ProcessInstanceGetResponse {
    return this._data;
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
  async cancel(comment: string | null = null): Promise<void> {
    if (!this.id) throw new Error('Instance ID is null');
    await this.service.cancel(this.id, this.folderKey, { comment });
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
  async pause(comment: string | null = null): Promise<void> {
    if (!this.id) throw new Error('Instance ID is null');
    await this.service.pause(this.id, this.folderKey, { comment });
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
  async resume(comment: string | null = null): Promise<void> {
    if (!this.id) throw new Error('Instance ID is null');
    await this.service.resume(this.id, this.folderKey, { comment });
  }

  /**
   * Creates a ProcessInstance from an API response
   * 
   * @param response The API response data
   * @param service The service instance for operations
   * @param folderKey The folder key for authorization
   * @returns A new ProcessInstance instance
   */
  static fromResponse(
    response: ProcessInstanceGetResponse, 
    service: ProcessInstanceServiceModel, 
  ): ProcessInstance {
    return new ProcessInstance(response, service);
  }
}