import { RawMaestroProcessGetAllResponse, MaestroProcess } from '../../models/maestro';
import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import { ProcessInstancesService } from './process-instances';
import type { MaestroProcessesServiceModel } from '../../models/maestro/process.models';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService implements MaestroProcessesServiceModel {
  private _processInstancesService: ProcessInstancesService;

  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
    this._processInstancesService = new ProcessInstancesService(config, executionContext, tokenManager);
  }

  /**
   * Get all processes with their instance statistics
   * @returns Promise resolving to array of MaestroProcess objects with fluent interface
   * 
   * @example
   * ```typescript
   * // Get all processes
   * const processes = await sdk.maestro.processes.getAll();
   * 
   * // Access process information and instances fluently
   * for (const process of processes) {
   *   console.log(`Process: ${process.processKey}`);
   *   
   *   // Get instances for this process
   *   const instances = await process.instances.getAll();
   *   
   *   // Get specific instance and perform actions
   *   if (instances.length > 0) {
   *     const instance = await process.instances.getById(instances[0].id);
   *     await instance.cancel('Example cancellation');
   *   }
   * 
   *   // Get process settings
   *   const settings = await process.getSettings();
   * }
   * 
   * // Filter processes with faulted instances
   * const faultedProcesses = processes.filter(p => p.faultedCount > 0);
   * ```
   */
  async getAll(): Promise<MaestroProcess[]> {
    const response = await this.get<RawMaestroProcessGetAllResponse>(MAESTRO_ENDPOINTS.PROCESSES.GET_ALL);
    
    // Convert to MaestroProcess rich objects following Task service pattern
    return response.data.processes.map(data => 
      new MaestroProcess(data, this._processInstancesService, this)
    );
  }
} 