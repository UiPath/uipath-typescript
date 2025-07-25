import { RawProcessData, RawGetAllProcessesResponse, transformProcess, ProcessSettings, MaestroProcess } from '../../models/maestro/maestroProcess';
import { BaseService } from '../baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';
import { unwrapAndMapResponse } from '../../utils/apiTransform';
import { TokenManager } from '../../core/auth/tokenManager';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
  }

  /**
   * Get all processes with their instance statistics
   * @returns Promise resolving to array of processes
   * 
   * @example
   * ```typescript
   * // Get all processes
   * const processes = await sdk.maestro.processes.getAll();
   * 
   * // Access process information
   * for (const process of processes) {
   *   console.log(`Process: ${process.processKey}`);
   * }
   * 
   * // Filter processes with faulted instances
   * const faultedProcesses = processes.filter(p => p.instanceCounts.faulted > 0);
   * ```
   */
  async getAll(): Promise<MaestroProcess[]> {
    const response = await this.get<RawGetAllProcessesResponse>('pims_/api/v1/processes/summary');
    return unwrapAndMapResponse<RawProcessData, MaestroProcess>(
      'processes',
      transformProcess
    )(response.data);
  }

  /**
   * Get Process Settings
   * Authorized via Processes.View folder permission
   * @param processKey - The unique identifier of the process
   * @returns Promise<ProcessSettings>
   */
  async getSettings(processKey: string): Promise<ProcessSettings> {
    const response = await this.get<ProcessSettings>(`pims_/api/v1/processes/${processKey}/settings`, {});
    return response.data;
  }
} 