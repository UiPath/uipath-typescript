import { MaestroProcessGetAllResponse, ProcessIncidentGetResponse, ProcessGetTopResponse } from '../../../models/maestro';
import type { IUiPath } from '../../../core/types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { MaestroProcessesServiceModel } from '../../../models/maestro/processes.models';
import { createProcessWithMethods } from '../../../models/maestro/processes.models';
import { MaestroInsightsService } from '../insights';
import { BpmnHelpers } from './helpers';
import { track } from '../../../core/telemetry';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY } from '../../../utils/constants/headers';
import { ProcessInstancesService } from './process-instances';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends MaestroInsightsService implements MaestroProcessesServiceModel {
  private processInstancesService: ProcessInstancesService;

  /**
   * Creates an instance of the Maestro Processes service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    this.processInstancesService = new ProcessInstancesService(instance);
  }

  /**
   * Get all processes with their instance statistics
   * @returns Promise resolving to array of MaestroProcess objects
   *
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   * const processes = await maestroProcesses.getAll();
   *
   * // Access process information
   * for (const process of processes) {
   *   console.log(`Process: ${process.processKey}`);
   *   console.log(`Running instances: ${process.runningCount}`);
   *   console.log(`Faulted instances: ${process.faultedCount}`);
   * }
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

  /**
   * Get the top processes ranked by run count within a time range.
   *
   * Returns an array of processes sorted by how many times they were executed,
   * useful for identifying the most active processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @returns Promise resolving to an array of {@link ProcessGetTopResponse}
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * // Get top processes by run count for the last 7 days
   * const topProcesses = await maestroProcesses.getTop(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const process of topProcesses) {
   *   console.log(`${process.packageId}: ${process.runCount} runs`);
   * }
   * ```
   */
  @track('MaestroProcesses.GetTop')
  async getTop(startTime: Date, endTime: Date): Promise<ProcessGetTopResponse[]> {
    const results = await this.fetchTopProcesses(startTime, endTime, false);
    return results.map(process => ({ ...process, name: process.packageId }));
  }
}