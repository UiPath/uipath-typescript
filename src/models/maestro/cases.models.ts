/**
 * Maestro Cases Models
 * Model classes for Maestro cases
 */

import { CaseGetAllResponse, CaseGetTopRunCountResponse, CaseGetTopFaultedCountResponse, CaseGetTopDurationResponse } from './cases.types';
import { TopQueryOptions, IncidentTimelineResponse, InstanceStatusTimelineResponse, TimelineOptions, ElementGetTopFailedCountResponse, ElementStats, InstanceStats, MaestroProcessStatsRequest } from './insights.types';

/**
 * Service for managing UiPath Maestro Cases
 *
 * UiPath Maestro Case Management describes solutions that help manage and automate the full flow of complex E2E scenarios.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Cases } from '@uipath/uipath-typescript/cases';
 *
 * const cases = new Cases(sdk);
 * const allCases = await cases.getAll();
 * ```
 */
export interface CasesServiceModel {
  /**
   * @returns Promise resolving to an array of {@link CaseGetAllWithMethodsResponse}
   * @example
   * ```typescript
   * // Get all case management processes
   * const allCases = await cases.getAll();
   *
   * // Access case information
   * for (const caseProcess of allCases) {
   *   console.log(`Case Process: ${caseProcess.processKey}`);
   *   console.log(`Running instances: ${caseProcess.runningCount}`);
   *   console.log(`Completed instances: ${caseProcess.completedCount}`);
   * }
   * ```
   */
  getAll(): Promise<CaseGetAllWithMethodsResponse[]>;

  /**
   * Get the top 5 case processes ranked by run count within a time range.
   *
   * Returns an array of up to 5 case processes sorted by how many times they were executed,
   * useful for identifying the most active case processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link CaseGetTopRunCountResponse}
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // Get top case processes by run count for the last 7 days
   * const topProcesses = await cases.getTopRunCount(
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
   * // Get top case processes by run count for a specific package
   * const filtered = await cases.getTopRunCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { packageId: '<packageId>' }
   * );
   * ```
   */
  getTopRunCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopRunCountResponse[]>;

  /**
   * Get the top 10 case processes ranked by failure count within a time range.
   *
   * Returns an array of up to 10 case processes sorted by how many instances faulted,
   * useful for identifying the most error-prone case processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link CaseGetTopFaultedCountResponse}
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // Get top case processes by faulted count for the last 7 days
   * const topFailing = await cases.getTopFaultedCount(
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
   * // Get top case processes by faulted count for a specific package
   * const filtered = await cases.getTopFaultedCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { packageId: '<packageId>' }
   * );
   * ```
   */
  getTopFaultedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopFaultedCountResponse[]>;

  /**
   * Get the top 10 BPMN elements ranked by failure count within a time range.
   *
   * Returns an array of up to 10 elements sorted by how many times they failed,
   * useful for identifying the most error-prone activities in case processes.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link ElementGetTopFailedCountResponse}
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // Get top failing elements for the last 7 days
   * const topFailing = await cases.getTopElementFailedCount(
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
   * const filtered = await cases.getTopElementFailedCount(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { processKey: '<processKey>' }
   * );
   * ```
   */
  getTopElementFailedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ElementGetTopFailedCountResponse[]>;

  /**
   * Get all instances status counts aggregated by date for case management processes.
   *
   * Returns time-grouped counts of case instances grouped by status (Completed, Faulted, Cancelled),
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
   * const statuses = await cases.getInstanceStatusTimeline(sevenDaysAgo, now);
   *
   * for (const entry of statuses) {
   *   console.log(`${entry.startTime} — ${entry.status}: ${entry.count}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { TimeInterval } from '@uipath/uipath-typescript/cases';
   *
   * // Get weekly breakdown
   * const statuses = await cases.getInstanceStatusTimeline(startTime, endTime, {
   *   groupBy: TimeInterval.Week,
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Filter to a specific case process
   * const filtered = await cases.getInstanceStatusTimeline(startTime, endTime, {
   *   processKeys: ['<processKey>'],
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Get all-time data (from Unix epoch to now)
   * const allTime = await cases.getInstanceStatusTimeline(new Date(0), new Date());
   * ```
   */
  getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<InstanceStatusTimelineResponse[]>;

  /**
   * Get incident counts aggregated by time bucket for case management processes.
   *
   * Returns time-grouped counts of incidents that occurred within each bucket,
   * useful for rendering incident time-series charts. Use `groupBy` to control
   * the time bucket size (hour, day, or week) — defaults to day if not provided.
   *
   * Each data point includes both `startTime` and `endTime` so the bucket
   * boundaries are unambiguous across DST transitions.
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
   * const incidents = await cases.getIncidentsTimeline(sevenDaysAgo, now);
   *
   * for (const point of incidents) {
   *   console.log(`${point.startTime} → ${point.endTime}: ${point.count} incidents`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { TimeInterval } from '@uipath/uipath-typescript/cases';
   *
   * // Get weekly breakdown
   * const incidents = await cases.getIncidentsTimeline(startTime, endTime, {
   *   groupBy: TimeInterval.Week,
   * });
   * ```
   *
   * @example
   * ```typescript
   * // Filter to a specific case process
   * const filtered = await cases.getIncidentsTimeline(startTime, endTime, {
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
   * Get the top 5 case processes ranked by total duration within a time range.
   *
   * Returns an array of up to 5 case processes sorted by their total execution time,
   * useful for identifying the longest-running case processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional filters (packageId, processKey, version)
   * @returns Promise resolving to an array of {@link CaseGetTopDurationResponse}
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
   *
   * // Get top case processes by duration for the last 7 days
   * const topProcesses = await cases.getTopExecutionDuration(
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
   * // Get top case processes by duration for a specific package
   * const filtered = await cases.getTopExecutionDuration(
   *   new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
   *   new Date(),
   *   { packageId: '<packageId>' }
   * );
   * ```
   */
  getTopExecutionDuration(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopDurationResponse[]>;

  /**
   * Get element stats for case instances
   *
   * Returns per-element execution counts (success, fail, terminated, paused, in-progress) and
   * duration percentile metrics (min, max, avg, p50, p95, p99) for BPMN elements within a case.
   *
   * @param request - Process scope + time range to aggregate over
   * @returns Promise resolving to an array of {@link ElementStats}
   * @example
   * ```typescript
   * // First, list cases to find the processKey, packageId, and available versions
   * const allCases = await cases.getAll();
   * const caseItem = allCases[0];
   *
   * // Get element metrics for that case
   * const elements = await cases.getElementStats({
   *   processKey: caseItem.processKey,
   *   packageId: caseItem.packageId,
   *   packageVersion: caseItem.packageVersions[0],
   *   startTime: new Date('2026-04-01'),
   *   endTime: new Date(),
   * });
   *
   * // Find elements with failures
   * const failedElements = elements.filter(e => e.failCount > 0);
   * for (const element of failedElements) {
   *   console.log(`Failed element: ${element.elementId}, failures: ${element.failCount}`);
   * }
   *
   * // Using bound method on a case — auto-fills processKey and packageId
   * const boundElements = await caseItem.getElementStats(
   *   new Date('2026-04-01'),
   *   new Date(),
   *   caseItem.packageVersions[0]
   * );
   * ```
   */
  getElementStats(request: MaestroProcessStatsRequest): Promise<ElementStats[]>;

  /**
   * Get instance stats for a case.
   *
   * Returns total instance counts broken down by status (running, completed, faulted, etc.)
   * and the average execution duration for all instances of a case within a time range.
   *
   * @param request - Process scope + time range to aggregate over
   * @returns Promise resolving to {@link InstanceStats}
   * @example
   * ```typescript
   * // First, list cases to find the processKey, packageId, and available versions
   * const allCases = await cases.getAll();
   * const caseItem = allCases[0];
   *
   * // Get instance status breakdown for that case
   * const counts = await cases.getInstanceStats({
   *   processKey: caseItem.processKey,
   *   packageId: caseItem.packageId,
   *   packageVersion: caseItem.packageVersions[0],
   *   startTime: new Date('2026-04-01'),
   *   endTime: new Date(),
   * });
   *
   * console.log(`Total: ${counts.totalCount}`);
   * console.log(`Completed: ${counts.completedCount}, Faulted: ${counts.faultedCount}`);
   *
   * // Using bound method on a case — auto-fills processKey and packageId
   * const boundCounts = await caseItem.getInstanceStats(
   *   new Date('2026-04-01'),
   *   new Date(),
   *   caseItem.packageVersions[0]
   * );
   * ```
   */
  getInstanceStats(request: MaestroProcessStatsRequest): Promise<InstanceStats>;
}

// Method interface that will be added to case objects
export interface CaseMethods {
  /**
   * Get element stats for this case
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to an array of {@link ElementStats}
   */
  getElementStats(startTime: Date, endTime: Date, packageVersion: string): Promise<ElementStats[]>;

  /**
   * Get instance stats for this case
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to {@link InstanceStats}
   */
  getInstanceStats(startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceStats>;
}

// Combined type for case data with methods
export type CaseGetAllWithMethodsResponse = CaseGetAllResponse & CaseMethods;

/**
 * Creates methods for a case object
 *
 * @param caseData - The case data (response from API)
 * @param service - The cases service instance
 * @returns Object containing case methods
 */
function createCaseMethods(caseData: CaseGetAllResponse, service: CasesServiceModel): CaseMethods {
  return {
    getElementStats(startTime: Date, endTime: Date, packageVersion: string): Promise<ElementStats[]> {
      if (!caseData.processKey) throw new Error('Process key is undefined');
      if (!caseData.packageId) throw new Error('Package ID is undefined');

      return service.getElementStats({
        processKey: caseData.processKey,
        packageId: caseData.packageId,
        packageVersion,
        startTime,
        endTime,
      });
    },
    getInstanceStats(startTime: Date, endTime: Date, packageVersion: string): Promise<InstanceStats> {
      if (!caseData.processKey) throw new Error('Process key is undefined');
      if (!caseData.packageId) throw new Error('Package ID is undefined');

      return service.getInstanceStats({
        processKey: caseData.processKey,
        packageId: caseData.packageId,
        packageVersion,
        startTime,
        endTime,
      });
    }
  };
}

/**
 * Creates an actionable case by combining API case data with operational methods.
 *
 * @param caseData - The case data from API
 * @param service - The cases service instance
 * @returns A case object with added methods
 */
export function createCaseWithMethods(
  caseData: CaseGetAllResponse,
  service: CasesServiceModel
): CaseGetAllWithMethodsResponse {
  const methods = createCaseMethods(caseData, service);
  return Object.assign({}, caseData, methods) as CaseGetAllWithMethodsResponse;
}
