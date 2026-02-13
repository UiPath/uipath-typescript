import { MaestroProcessGetAllResponse, ProcessIncidentGetResponse } from '../../models/maestro';
import { BaseService } from '../base';
import { Config } from '../../core/config/config';
import { ExecutionContext } from '../../core/context/execution';
import { TokenManager } from '../../core/auth/token-manager';
import { MAESTRO_ENDPOINTS } from '../../utils/constants/endpoints';
import type { MaestroProcessesServiceModel } from '../../models/maestro/processes.models';
import { createProcessWithMethods } from '../../models/maestro/processes.models';
import { BpmnHelpers } from './helpers';
import { track } from '../../core/telemetry';
import { createHeaders } from '../../utils/http/headers';
import { FOLDER_KEY } from '../../utils/constants/headers';
import { ProcessInstancesService } from './process-instances';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService implements MaestroProcessesServiceModel {
  private processInstancesService: ProcessInstancesService;

  /**
   * @hideconstructor
   */
  constructor(config: Config, executionContext: ExecutionContext, tokenManager: TokenManager) {
    super(config, executionContext, tokenManager);
    this.processInstancesService = new ProcessInstancesService(config, executionContext, tokenManager);
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
  @track('MaestroProcesses.GetAll')
  async getAll(): Promise<MaestroProcessGetAllResponse[]> {
    const response = await this.get<{ processes: Omit<MaestroProcessGetAllResponse, 'name'>[] }>(
      MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
    );
    
    // Extract processes array from response data and add name field
    const processes = response.data?.processes || [];
    const processesWithName = processes.map(process => ({
      ...process,
      name: process.packageId
    }));

    // Add methods to each process
    return processesWithName.map(process => createProcessWithMethods(process, this));
  }

  /**
   * Get incidents for a specific process
   */
  @track('MaestroProcesses.GetIncidents')
  async getIncidents(processKey: string, folderKey: string): Promise<ProcessIncidentGetResponse[]> {
    const rawResponse = await this.get<any[]>(
      MAESTRO_ENDPOINTS.INCIDENTS.GET_BY_PROCESS(processKey),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );

    // Fetch BPMN XML and add element name/type to each incident
    return BpmnHelpers.enrichIncidentsWithBpmnData(rawResponse.data || [], folderKey, this.processInstancesService);
  }
} 