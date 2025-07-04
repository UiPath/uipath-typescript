import { GetAllProcessesSummaryResponse, ProcessSettings } from '../../models/maestro/maestroProcess';
import { BaseService } from '../baseService';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/executionContext';

export class MaestroProcessesService extends BaseService {
  constructor(config: Config, executionContext: ExecutionContext) {
    super(config, executionContext);
  }

  /**
   * Get All Processes Summary
   * Includes all folders in tenant user has Jobs.View permission for
   * @returns Promise<GetAllProcessesSummaryResponse>
   */
  async getSummary(): Promise<GetAllProcessesSummaryResponse> {
    const response = await this.get<GetAllProcessesSummaryResponse>('pims_/api/v1/processes/summary', {
    });
    return response.data;
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