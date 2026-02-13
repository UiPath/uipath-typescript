import type {
  ProcessIncidentGetAllResponse
} from './process-incidents.types';

/**
 * Service for managing UiPath Maestro Process incidents
 * 
 * Maestro Process incidents helps you identify, investigate, and resolve errors that occur during process execution. [UiPath Maestro Process Incidents Guide](https://docs.uipath.com/maestro/automation-cloud/latest/user-guide/all-incidents-view)
 */
export interface ProcessIncidentsServiceModel {
  /**
   * Get all process incidents across all folders
   * 
   * @returns Promise resolving to array of process incident
   * {@link ProcessIncidentGetAllResponse}
   * @example
   * ```typescript
   * import { ProcessIncidents } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const processIncidents = new ProcessIncidents(sdk);
   *
   * // Get all process incidents across all folders
   * const incidents = await processIncidents.getAll();
   *
   * // Access process incident information
   * for (const incident of incidents) {
   *   console.log(`Process: ${incident.processKey}`);
   *   console.log(`Error: ${incident.errorMessage}`);
   *   console.log(`Count: ${incident.count}`);
   *   console.log(`First occurrence: ${incident.firstOccuranceTime}`);
   * }
   * ```
   */
  getAll(): Promise<ProcessIncidentGetAllResponse[]>;
}
