import { MaestroProcessGetAllResponse, ProcessIncidentGetResponse } from '../../../models/maestro';
import { MaestroProcessGetByNameOptions } from '../../../models/maestro/processes.types';
import { BaseService } from '../../base';
import type { IUiPath } from '../../../core/types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { MaestroProcessesServiceModel } from '../../../models/maestro/processes.models';
import { createProcessWithMethods } from '../../../models/maestro/processes.models';
import { BpmnHelpers } from './helpers';
import { track } from '../../../core/telemetry';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY } from '../../../utils/constants/headers';
import { ProcessInstancesService } from './process-instances';
import { findMaestroResourceByName, MaestroResourceType } from '../helpers/get-by-name';
import { validateName } from '../../../utils/validation/name-validator';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService implements MaestroProcessesServiceModel {
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
   * Retrieves a single Maestro process by name.
   *
   * @param name - Process name to search for
   * @param options - Folder scoping (`folderKey` / `folderPath`)
   * @returns Promise resolving to a single Maestro process with bound methods
   * @throws ValidationError when the name is empty; NotFoundError when no match
   *
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * // By folder key (GUID)
   * await maestroProcesses.getByName('MyMaestroProcess', { folderKey: '5f6dadf1-3677-49dc-8aca-c2999dd4b3ba' });
   *
   * // By folder path
   * await maestroProcesses.getByName('MyMaestroProcess', { folderPath: 'Shared/Finance' });
   * ```
   */
  @track('MaestroProcesses.GetByName')
  async getByName(
    name: string,
    options: MaestroProcessGetByNameOptions = {},
  ): Promise<MaestroProcessGetAllResponse> {
    const validatedName = validateName(MaestroResourceType.MaestroProcess, name);
    const all = await this.getAll();
    return findMaestroResourceByName(MaestroResourceType.MaestroProcess, all, validatedName, {
      folderPath: options.folderPath,
      folderKey: options.folderKey,
      fallbackFolderKey: this.config.folderKey,
    });
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