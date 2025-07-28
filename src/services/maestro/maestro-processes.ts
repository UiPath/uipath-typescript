import { RawProcessData, RawMaestroProcessGetAllResponse, transformMaestroProcess, MaestroProcessSettingsResponse, MaestroProcessGetAllResponse } from '../../models/maestro';
import { BaseService } from '../base-service';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution-context';
import { unwrapAndMapResponse } from '../../utils/api-transform';
import { TokenManager } from '../../core/auth/token-manager';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';

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
  async getAll(): Promise<MaestroProcessGetAllResponse[]> {
    const response = await this.get<RawMaestroProcessGetAllResponse>(MAESTRO_ENDPOINTS.PROCESSES.GET_ALL);
    return unwrapAndMapResponse<RawProcessData, MaestroProcessGetAllResponse>(
      'processes',
      transformMaestroProcess
    )(response.data);
  }

  /**
   * Get Process Settings
   * Authorized via Processes.View folder permission
   * @param processKey - The unique identifier of the process
   * @returns Promise<ProcessSettings>
   */
  async getSettings(processKey: string): Promise<MaestroProcessSettingsResponse> {
    const response = await this.get<MaestroProcessSettingsResponse>(MAESTRO_ENDPOINTS.PROCESSES.GET_SETTINGS(processKey), {});
    return response.data;
  }
} 