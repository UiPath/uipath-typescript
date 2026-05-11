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
import { NotFoundError } from '../../../core/errors';
import { validateGetByNameArgs } from '../../../utils/validation/name-validator';
import { ProcessInstancesService } from './process-instances';

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
   * Retrieves a single Maestro process by name, optionally scoped to a folder.
   *
   * Implemented as a client-side filter over `getAll()` because the Maestro
   * `/api/v1/processes/summary` endpoint returns the full list and exposes no
   * name-based lookup. `folderPath` is matched against the `folderName` field
   * returned by `getAll()`; `folderKey` is matched against `folderKey`. When
   * neither is supplied, the SDK falls back to the init-time folderKey
   * (e.g. `uipath:folder-key` meta tag in coded-app deployments). No extra
   * network call; the data was already fetched.
   *
   * @param name - Process name to search for
   * @param options - Optional folderPath / folderKey scoping
   * @returns Promise resolving to a single Maestro process with bound methods
   * @throws ValidationError when inputs are malformed; NotFoundError when no match
   *
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * const process = await maestroProcesses.getByName('MyMaestroProcess', {
   *   folderPath: 'Shared/Finance',
   * });
   * const incidents = await process.getIncidents();
   * ```
   */
  @track('MaestroProcesses.GetByName')
  async getByName(
    name: string,
    options: MaestroProcessGetByNameOptions = {},
  ): Promise<MaestroProcessGetAllResponse> {
    const validated = validateGetByNameArgs(
      'MaestroProcess',
      name,
      options.folderPath,
      options.folderKey,
    );

    // Fall back to init-time folderKey (e.g. uipath:folder-key meta tag) only
    // when the caller didn't supply any folder context.
    const effectiveFolderKey =
      validated.folderKey ?? (validated.folderPath ? undefined : this.config.folderKey);

    const all = await this.getAll();
    const match = all.find(
      (p) =>
        p.name === validated.name &&
        (validated.folderPath ? p.folderName === validated.folderPath : true) &&
        (effectiveFolderKey ? p.folderKey === effectiveFolderKey : true),
    );

    if (!match) {
      const folderHint =
        validated.folderPath ? ` in folder '${validated.folderPath}'`
        : effectiveFolderKey ? ` in folder (key: ${effectiveFolderKey})`
        : '';
      throw new NotFoundError({
        message: `MaestroProcess '${validated.name}' not found${folderHint}.`,
      });
    }
    return match;
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