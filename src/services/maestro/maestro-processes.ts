import { MaestroProcessGetAllResponse } from '../../models/maestro';
import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { TokenManager } from '../../core/auth/token-manager';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import type { MaestroProcessesServiceModel } from '../../models/maestro/process.models';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService implements MaestroProcessesServiceModel {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Get all processes with their instance statistics
   * @returns Promise resolving to array of MaestroProcess objects
   * 
   * @example
   * ```typescript
   * // Get all processes
   * const processes = await sdk.maestro.processes.getAll();
   * 
   * // Access process information
   * for (const process of processes) {
   *   console.log(`Process: ${process.processKey}`);
   *   console.log(`Running instances: ${process.runningCount}`);
   *   console.log(`Faulted instances: ${process.faultedCount}`);
   * }
   * 
   * ```
   */
  @track('GetAll')
  async getAll(): Promise<MaestroProcessGetAllResponse[]> {
    const response = await this.get<MaestroProcessGetAllResponse[]>(MAESTRO_ENDPOINTS.PROCESSES.GET_ALL);
    
    // Return the data directly with null safety
    return response.data || [];
  }
} 