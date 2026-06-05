/**
 * Maestro Process Models
 * Model classes for Maestro processes
 */

import { RawMaestroProcessGetAllResponse, ProcessGetTopRunCountResponse, ProcessGetTopFaultedCountResponse, ProcessGetTopDurationResponse } from './processes.types';
import { ProcessIncidentGetResponse } from './process-incidents.types';
import { TopQueryOptions, IncidentTimelineResponse, InstanceStatusTimelineResponse, TimelineOptions, ElementGetTopFailedCountResponse, ElementStats, InstanceStats, MaestroProcessStatsRequest } from './insights.types';

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
   * @param options - Optional settings for filtering and time bucket granularity
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
   * // Filter to a specific process
   * const filtered = await maestroProcesses.getInstanceStatusTimeline(startTime, endTime, {
   *   processKeys: ['<processKey>'],
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
   * Get incident counts aggregated by time bucket for maestro processes.
   *
   * Returns time-grouped counts of incidents that occurred within each bucket,
   * useful for rendering incident time-series charts. Use `groupBy` to control
   * the time bucket size (hour, day, or week) — defaults to day if not provided.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional settings for filtering and time bucket granularity
   * @returns Promise resolving to an array of {@link IncidentTimelineResponse}
   *
   * @example
   * ```typescript
   * // Get daily incident counts for the last 7 days
   * const now = new Date();
   * const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
   * const incidents = await maestroProcesses.getIncidentsTimeline(sevenDaysAgo, now);
   *
   * for (const point of incidents) {
   *   console.log(`${point.startTime} → ${point.endTime}: ${point.count} incidents`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { TimeInterval } from '@uipath/uipath-typescript/maestro-processes';
   *
   * // Get weekly breakdown
   * const incidents = await maestroProcesses.getIncidentsTimeline(startTime, endTime, {
   *   groupBy: TimeInterval.Week,
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Filter to a specific process
   * const filtered = await maestroProcesses.getIncidentsTimeline(startTime, endTime, {
   *   processKeys: ['<processKey>'],
   * });
   * ```
   */
  getIncidentsTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<IncidentTimelineResponse[]>;

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
   * @param request - Process scope + time range to aggregate over
   * @returns Promise resolving to an array of {@link ElementStats}
   * @example
   * ```typescript
   * // First, list processes to find the processKey, packageId, and available versions
   * const processes = await maestroProcesses.getAll();
   * const process = processes[0];
   *
   * // Get element metrics for that process
   * const elements = await maestroProcesses.getElementStats({
   *   processKey: process.processKey,
   *   packageId: process.packageId,
   *   packageVersion: process.packageVersions[0],
   *   startTime: new Date('2026-04-01'),
   *   endTime: new Date(),
   * });
   *
   * // Analyze element performance
   * for (const element of elements) {
   *   console.log(`Element: ${element.elementId}`);
   *   console.log(`  Success: ${element.successCount}, Failed: ${element.failCount}`);
   *   console.log(`  Avg duration: ${element.avgDurationMs}ms, P95: ${element.p95DurationMs}ms`);
   * }
   *
   * // Using bound method on a process — auto-fills processKey and packageId
   * const boundElements = await process.getElementStats(
   *   new Date('2026-04-01'),
   *   new Date(),
   *   process.packageVersions[0]
   * );
   * ```
   */
  getElementStats(request: MaestroProcessStatsRequest): Promise<ElementStats[]>;

  /**
   * Get instance stats for a process.
   *
   * Returns total instance counts broken down by status (running, completed, faulted, etc.)
   * and the average execution duration for all instances of a process within a time range.
   *
   * @param request - Process scope + time range to aggregate over
   * @returns Promise resolving to {@link InstanceStats}
   * @example
   * ```typescript
   * // First, list processes to find the processKey, packageId, and available versions
   * const processes = await maestroProcesses.getAll();
   * const process = processes[0];
   *
   * // Get instance status breakdown for that process
   * const counts = await maestroProcesses.getInstanceStats({
   *   processKey: process.processKey,
   *   packageId: process.packageId,
   *   packageVersion: process.packageVersions[0],
   *   startTime: new Date('2026-04-01'),
   *   endTime: new Date(),
   * });
   *
   * console.log(`Total: ${counts.totalCount}`);
   * console.log(`Running: ${counts.runningCount}, Completed: ${counts.completedCount}`);
   * console.log(`Faulted: ${counts.faultedCount}, Avg duration: ${counts.avgDurationMs}ms`);
   *
   * // Using bound method on a process — auto-fills processKey and packageId
   * const boundCounts = await process.getInstanceStats(
   *   new Date('2026-04-01'),
   *   new Date(),
   *   process.packageVersions[0]
   * );
   * ```
   */
  getInstanceStats(request: MaestroProcessStatsRequest): Promise<InstanceStats>;
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
   * Get instance stats for this process
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to {@link InstanceStats}
   */
  getInstanceStats(startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceStats>;

  /**
   * Get instance status counts aggregated by date for this process.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional settings for filtering and time bucket granularity (processKey is auto-captured from this process)
   * @returns Promise resolving to an array of {@link InstanceStatusTimelineResponse}
   */
  getInstanceStatusTimeline(startTime: Date, endTime: Date, options?: Omit<TimelineOptions, 'processKeys'>): Promise<InstanceStatusTimelineResponse[]>;

  /**
   * Get incident counts aggregated by time bucket for this process.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional settings for filtering and time bucket granularity (processKey is auto-captured from this process)
   * @returns Promise resolving to an array of {@link IncidentTimelineResponse}
   */
  getIncidentsTimeline(startTime: Date, endTime: Date, options?: Omit<TimelineOptions, 'processKeys'>): Promise<IncidentTimelineResponse[]>;
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

      return service.getElementStats({
        processKey: processData.processKey,
        packageId: processData.packageId,
        packageVersion,
        startTime,
        endTime,
      });
    },
    getInstanceStats(startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceStats> {
      if (!processData.processKey) throw new Error('Process key is undefined');
      if (!processData.packageId) throw new Error('Package ID is undefined');

      return service.getInstanceStats({
        processKey: processData.processKey,
        packageId: processData.packageId,
        packageVersion,
        startTime,
        endTime,
      });
    },
    getInstanceStatusTimeline(startTime: Date, endTime: Date, options?: Omit<TimelineOptions, 'processKeys'>): Promise<InstanceStatusTimelineResponse[]> {
      if (!processData.processKey) throw new Error('Process key is undefined');

      return service.getInstanceStatusTimeline(startTime, endTime, { ...options, processKeys: [processData.processKey] });
    },
    getIncidentsTimeline(startTime: Date, endTime: Date, options?: Omit<TimelineOptions, 'processKeys'>): Promise<IncidentTimelineResponse[]> {
      if (!processData.processKey) throw new Error('Process key is undefined');

      return service.getIncidentsTimeline(startTime, endTime, { ...options, processKeys: [processData.processKey] });
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
