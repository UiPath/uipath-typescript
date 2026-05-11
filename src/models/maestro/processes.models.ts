/**
 * Maestro Process Models
 * Model classes for Maestro processes
 */

import { MaestroProcessGetByNameOptions, RawMaestroProcessGetAllResponse } from './processes.types';
import { ProcessIncidentGetResponse } from './process-incidents.types';

/**
 * Service for managing UiPath Maestro Processes
 *
 * UiPath Maestro is a cloud-native orchestration layer that coordinates bots, AI agents, and humans for seamless, intelligent automation of complex workflows. [UiPath Maestro Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/introduction-to-maestro)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
 *
 * const maestroProcesses = new MaestroProcesses(sdk);
 * const allProcesses = await maestroProcesses.getAll();
 * ```
 */
export interface MaestroProcessesServiceModel {
  /**
   * @returns Promise resolving to array of MaestroProcess objects with methods
   * {@link MaestroProcessGetAllResponse}
   * @example
   * ```typescript
   * // Get all processes
   * const allProcesses = await maestroProcesses.getAll();
   *
   * // Access process information and incidents
   * for (const process of allProcesses) {
   *   console.log(`Process: ${process.processKey}`);
   *   console.log(`Running instances: ${process.runningCount}`);
   *   console.log(`Faulted instances: ${process.faultedCount}`);
   *
   *   // Get incidents for this process
   *   const incidents = await process.getIncidents();
   *   console.log(`Incidents: ${incidents.length}`);
   * }
   * ```
   */
  getAll(): Promise<MaestroProcessGetAllResponse[]>;

  /**
   * Retrieves a single Maestro process by name, optionally scoped to a folder.
   *
   * Implemented as a client-side filter over `getAll()` because the Maestro
   * API does not expose a name-based lookup endpoint. `folderPath` is matched
   * client-side against the `folderName` field returned by `getAll()`;
   * `folderKey` matches `folderKey`. When neither is supplied, the SDK falls
   * back to the init-time folderKey (e.g. from the `uipath:folder-key` meta
   * tag in coded-app deployments).
   *
   * Useful for bindings-driven code that has `name` (+ optional folder
   * context) at design time and wants to resolve to the operational
   * `processKey`.
   *
   * @param name - Process name (currently maps to `packageId`)
   * @param options - Optional folderPath / folderKey scoping
   * @returns Promise resolving to a single Maestro process with bound methods
   * {@link MaestroProcessGetAllResponse}
   * @throws NotFoundError if no process matches
   * @example
   * ```typescript
   * // Get a process by name within a folder
   * const process = await maestroProcesses.getByName('MyMaestroProcess', {
   *   folderPath: 'Shared/Finance',
   * });
   *
   * // Then operate on it
   * const incidents = await process.getIncidents();
   * ```
   */
  getByName(name: string, options?: MaestroProcessGetByNameOptions): Promise<MaestroProcessGetAllResponse>;

  /**
   * Get incidents for a specific process
   * 
   * @param processKey The key of the process to get incidents for
   * @param folderKey The folder key for authorization
   * @returns Promise resolving to array of incidents for the process
   * {@link ProcessIncidentGetResponse}
   * @example
   * ```typescript
   * // Get incidents for a specific process
   * const incidents = await maestroProcesses.getIncidents('<processKey>', '<folderKey>');
   *
   * // Access incident details
   * for (const incident of incidents) {
   *   console.log(`Element: ${incident.incidentElementActivityName} (${incident.incidentElementActivityType})`);
   *   console.log(`Status: ${incident.incidentStatus}`);
   *   console.log(`Error: ${incident.errorMessage}`);
   * }
   * ```
   */
  getIncidents(processKey: string, folderKey: string): Promise<ProcessIncidentGetResponse[]>;
}

// Method interface that will be added to process objects
export interface ProcessMethods {
  /**
   * Gets incidents for this process
   * 
   * @returns Promise resolving to array of process incidents
   */
  getIncidents(): Promise<ProcessIncidentGetResponse[]>;
}

// Combined type for process data with methods
export type MaestroProcessGetAllResponse = RawMaestroProcessGetAllResponse & ProcessMethods;

/**
 * Creates methods for a process object
 * 
 * @param processData - The process data (response from API)
 * @param service - The process service instance
 * @returns Object containing process methods
 */
function createProcessMethods(processData: RawMaestroProcessGetAllResponse, service: MaestroProcessesServiceModel): ProcessMethods {
  return {
    async getIncidents(): Promise<ProcessIncidentGetResponse[]> {
      if (!processData.processKey) throw new Error('Process key is undefined');
      if (!processData.folderKey) throw new Error('Folder key is undefined');
      
      return service.getIncidents(processData.processKey, processData.folderKey);
    }
  };
}

/**
 * Creates an actionable process by combining API process data with operational methods.
 * 
 * @param processData - The process data from API
 * @param service - The process service instance
 * @returns A process object with added methods
 */
export function createProcessWithMethods(
  processData: MaestroProcessGetAllResponse, 
  service: MaestroProcessesServiceModel
): MaestroProcessGetAllResponse {
  const methods = createProcessMethods(processData, service);
  return Object.assign({}, processData, methods) as MaestroProcessGetAllResponse;
}
