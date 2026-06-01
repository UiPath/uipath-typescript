/**
 * Maestro Process Models
 * Model classes for Maestro processes
 */

import { RawMaestroProcessGetAllResponse, ProcessGetTopRunCountResponse, ProcessGetTopFaultedCountResponse, ProcessGetTopDurationResponse } from './processes.types';
import { ProcessIncidentGetResponse } from './process-incidents.types';
import { TopQueryOptions, InstanceStatusTimelineResponse, TimelineOptions, ElementGetTopFailedCountResponse, ElementStats, InstanceCountByStatusResponse } from './insights.types';

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
   * @param options - Optional filters (packageId, processKey, version)
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
   *
   * @example
   * ```typescript
   * // Get top processes by run count for a specific package
   * const filtered = await maestroProcesses.getTopRunCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { packageId: '<packageId>' }
   * );
   * ```
   */
  getTopRunCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopRunCountResponse[]>;

  /**
   * Get the top 10 processes ranked by failure count within a time range.
   *
   * Returns an array of up to 10 processes sorted by how many instances faulted,
   * useful for identifying the most error-prone processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link ProcessGetTopFaultedCountResponse}
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * // Get top processes by faulted count for the last 7 days
   * const topFailing = await maestroProcesses.getTopFaultedCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const process of topFailing) {
   *   console.log(`${process.packageId}: ${process.faultedCount} failures`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Get top processes by faulted count for a specific package
   * const filtered = await maestroProcesses.getTopFaultedCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { packageId: '<packageId>' }
   * );
   * ```
   */
  getTopFaultedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopFaultedCountResponse[]>;

  /**
   * Get the top 10 BPMN elements ranked by failure count within a time range.
   *
   * Returns an array of up to 10 elements sorted by how many times they failed,
   * useful for identifying the most error-prone activities in processes.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link ElementGetTopFailedCountResponse}
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * // Get top failing elements for the last 7 days
   * const topFailing = await maestroProcesses.getTopElementFailedCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const element of topFailing) {
   *   console.log(`${element.elementName} (${element.elementType}): ${element.failedCount} failures`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Get top failing elements for a specific process
   * const filtered = await maestroProcesses.getTopElementFailedCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { processKey: '<processKey>' }
   * );
   * ```
   */
  getTopElementFailedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ElementGetTopFailedCountResponse[]>;

  /**
   * Get all instances status counts aggregated by date for maestro processes.
   *
   * Returns time-grouped counts of instances grouped by status (Completed, Faulted, Cancelled),
   * useful for rendering time-series charts. Use `groupBy` to control the time bucket size
   * (hour, day, or week) — defaults to day if not provided.
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
   * import { TimeInterval } from '@uipath/uipath-typescript/maestro-processes';
   *
   * // Get hourly breakdown
   * const statuses = await maestroProcesses.getInstanceStatusTimeline(startTime, endTime, {
   *   groupBy: TimeInterval.Hour,
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Get all-time data (from Unix epoch to now)
   * const allTime = await maestroProcesses.getInstanceStatusTimeline(new Date(0), new Date());
   * ```
   */
  getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<InstanceStatusTimelineResponse[]>;

  /**
   * Get the top 5 processes ranked by total duration within a time range.
   *
   * Returns an array of up to 5 processes sorted by their total execution time,
   * useful for identifying the longest-running processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link ProcessGetTopDurationResponse}
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   *
   * // Get top processes by duration for the last 7 days
   * const topProcesses = await maestroProcesses.getTopExecutionDuration(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date()
   * );
   *
   * for (const process of topProcesses) {
   *   console.log(`${process.packageId}: ${process.duration}ms total`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Get top processes by duration for a specific package
   * const filtered = await maestroProcesses.getTopExecutionDuration(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { packageId: '<packageId>' }
   * );
   * ```
   */
  getTopExecutionDuration(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopDurationResponse[]>;

  /**
   * Get element stats for process instances
   *
   * Returns per-element execution counts (success, fail, terminated, paused, in-progress) and
   * duration percentile metrics (min, max, avg, p50, p95, p99) for BPMN elements within a process.
   *
   * @param processKey - Process key to filter by
   * @param packageId - Package identifier
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to an array of {@link ElementStats}
   * @example
   * ```typescript
   * // Get element metrics for a process
   * const elements = await maestroProcesses.getElementStats(
   *   '<processKey>',
   *   '<packageId>',
   *   new Date('2026-04-01'),
   *   new Date(),
   *   '1.0.1'
   * );
   *
   * // Analyze element performance
   * for (const element of elements) {
   *   console.log(`Element: ${element.elementId}`);
   *   console.log(`  Success: ${element.successCount}, Failed: ${element.failCount}`);
   *   console.log(`  Avg duration: ${element.avgDurationMs}ms, P95: ${element.p95DurationMs}ms`);
   * }
   * ```
   */
  getElementStats(processKey: string, packageId: string, startTime: Date, endTime: Date, packageVersion: string): Promise<ElementStats[]>;

  /**
   * Get instance count aggregated by status for a process.
   *
   * Returns total instance counts broken down by status (running, completed, faulted, etc.)
   * and the average execution duration for all instances of a process within a time range.
   *
   * @param processKey - Process key to filter by
   * @param packageId - Package identifier
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to {@link InstanceCountByStatusResponse}
   * @example
   * ```typescript
   * // Get instance status breakdown for a process
   * const counts = await maestroProcesses.getInstanceCountByStatus(
   *   '<processKey>',
   *   '<packageId>',
   *   new Date('2026-04-01'),
   *   new Date(),
   *   '1.0.1'
   * );
   *
   * console.log(`Total: ${counts.countOfAllInstances}`);
   * console.log(`Running: ${counts.countOfRunning}, Completed: ${counts.countOfCompleted}`);
   * console.log(`Faulted: ${counts.countOfFaulted}, Avg duration: ${counts.avgDurationInMs}ms`);
   * ```
   */
  getInstanceCountByStatus(processKey: string, packageId: string, startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceCountByStatusResponse>;
}

// Method interface that will be added to process objects
export interface ProcessMethods {
  /**
   * Gets incidents for this process
   *
   * @returns Promise resolving to array of process incidents
   */
  getIncidents(): Promise<ProcessIncidentGetResponse[]>;

  /**
   * Get element stats for this process
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to an array of {@link ElementStats}
   */
  getElementStats(startTime: Date, endTime: Date, packageVersion: string): Promise<ElementStats[]>;

  /**
   * Get instance count aggregated by status for this process
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to {@link InstanceCountByStatusResponse}
   */
  getInstanceCountByStatus(startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceCountByStatusResponse>;
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
    },
    getElementStats(startTime: Date, endTime: Date, packageVersion: string): Promise<ElementStats[]> {
      if (!processData.processKey) throw new Error('Process key is undefined');
      if (!processData.packageId) throw new Error('Package ID is undefined');

      return service.getElementStats(processData.processKey, processData.packageId, startTime, endTime, packageVersion);
    },
    getInstanceCountByStatus(startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceCountByStatusResponse> {
      if (!processData.processKey) throw new Error('Process key is undefined');
      if (!processData.packageId) throw new Error('Package ID is undefined');

      return service.getInstanceCountByStatus(processData.processKey, processData.packageId, startTime, endTime, packageVersion);
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
