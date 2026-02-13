/**
 * Maestro Process Models
 * Model classes for Maestro processes
 */

import { RawMaestroProcessGetAllResponse } from './processes.types';
import { ProcessIncidentGetResponse } from './process-incidents.types';

/**
 * Service for managing UiPath Maestro Processes
 * 
 * UiPath Maestro is a cloud-native orchestration layer that coordinates bots, AI agents, and humans for seamless, intelligent automation of complex workflows. [UiPath Maestro Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/introduction-to-maestro)
 */
export interface MaestroProcessesServiceModel {
  /**
   * @returns Promise resolving to array of MaestroProcess objects with methods
   * {@link MaestroProcessGetAllResponse}
   * @example
   * ```typescript
   * // Get all processes
   * const processes = await sdk.maestro.processes.getAll();
   * 
   * // Access process information and incidents
   * for (const process of processes) {
   *   console.log(`Process: ${process.processKey}`);
   *   console.log(`Running instances: ${process.runningCount}`);
   *   console.log(`Faulted instances: ${process.faultedCount}`);
   *   
   *   // Get incidents for this process
   *   const incidents = await process.getIncidents();
   *   console.log(`Incidents: ${incidents.length}`);
   * }
   * 
   * ```
   */
  getAll(): Promise<MaestroProcessGetAllResponse[]>;

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
   * const incidents = await sdk.maestro.processes.getIncidents('<processKey>', '<folderKey>');
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
