/**
 * Maestro Process Models
 * Model classes for Maestro processes
 */

import { RawMaestroProcessGetAllResponse, ProcessGetTopRunCountResponse } from './processes.types';
import { ProcessIncidentGetResponse } from './process-incidents.types';
import { InstanceStatusTimelineResponse, MaestroInsightsOptions } from './insights.types';

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

  /**
   * Get the top 5 processes ranked by run count within a time range.
   *
   * Returns an array of up to 5 processes sorted by how many times they were executed,
   * useful for identifying the most active processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @returns Promise resolving to an array of {@link ProcessGetTopRunCountResponse}
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * // Get top processes by run count for the last 7 days
   * const topProcesses = await maestroProcesses.getTopRunCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const process of topProcesses) {
   *   console.log(`${process.packageId}: ${process.runCount} runs`);
   * }
   * ```
   */
  getTopRunCount(startTime: Date, endTime: Date): Promise<ProcessGetTopRunCountResponse[]>;

  /**
   * Get all instances status counts aggregated by date for maestro processes.
   *
   * Returns time-bucketed counts of instances grouped by status (Completed, Faulted, Cancelled),
   * useful for rendering time-series charts. The time bucket granularity is controlled by `timeSliceUnit`.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional settings for time bucketing granularity
   * @returns Promise resolving to an array of {@link InstanceStatusTimelineResponse}
   *
   * @example
   * ```typescript
   * // Get daily instance status for the last 7 days
   * const now = new Date();
   * const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
   * const statuses = await maestroProcesses.getInstanceStatusTimeline(sevenDaysAgo, now);
   *
   * for (const entry of statuses) {
   *   console.log(`${entry.startTime} — ${entry.status}: ${entry.count}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { TimeSliceUnit } from '@uipath/uipath-typescript/maestro-processes';
   *
   * // Get hourly breakdown
   * const statuses = await maestroProcesses.getInstanceStatusTimeline(startTime, endTime, {
   *   timeSliceUnit: TimeSliceUnit.Hour,
   * });
   * ```
   */
  getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: MaestroInsightsOptions,
  ): Promise<InstanceStatusTimelineResponse[]>;
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
