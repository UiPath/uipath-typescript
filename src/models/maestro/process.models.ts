/**
 * Maestro Process Models
 * Model classes for Maestro processes with fluent interface support
 */

import { MaestroProcessGetAllResponse } from './process.types';
import { ProcessInstancesCollection } from './process-instance.models';
import { ProcessInstancesService } from '../../services/maestro/process-instances';

/**
 * Service interface for MaestroProcessesService
 * Defines the contract that the service must implement
 */
export interface MaestroProcessesServiceModel {
  getAll(): Promise<MaestroProcess[]>;
}

/**
 * Enhanced MaestroProcess class providing fluent interface for process operations
 * Uses interface declaration merging to avoid property duplication
 */
export interface MaestroProcess extends MaestroProcessGetAllResponse {}

export class MaestroProcess {
  private readonly _instances: ProcessInstancesCollection;

  constructor(
    data: MaestroProcessGetAllResponse,
    private readonly processInstancesService: ProcessInstancesService,
    private readonly processesService: MaestroProcessesServiceModel
  ) {
    // Copy all fields from data to this instance
    Object.assign(this, data);
    
    // Initialize instances collection
    this._instances = new ProcessInstancesCollection(
      data.processKey,
      data.folderKey,
      processInstancesService
    );
  }

  /**
   * Access to process instances with fluent API
   * 
   * @example
   * ```typescript
   * // Get all instances for this process
   * const instances = await process.instances.getAll();
   * 
   * // Get specific instance
   * const instance = await process.instances.getById('instance-123');
   * 
   * // Cancel an instance
   * await instance.cancel('Cancelled due to timeout');
   * ```
   */
  get instances(): ProcessInstancesCollection {
    return this._instances;
  }


} 