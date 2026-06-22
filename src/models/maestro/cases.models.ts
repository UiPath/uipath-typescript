/**
 * Maestro Cases Models
 * Model classes for Maestro cases
 */

import { CaseGetAllResponse, CaseGetTopRunCountResponse, CaseGetTopFaultedCountResponse, CaseGetTopDurationResponse } from './cases.types';
import { TopQueryOptions, InstanceStatusTimelineResponse, TimelineOptions, ElementGetTopFailedCountResponse, ElementStats, IncidentTimelinePoint } from './insights.types';

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
   * @param options - Optional settings for time bucketing granularity
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
   * Get incident counts over time for case management processes.
   *
   * Returns time-grouped incident counts, useful for rendering "incidents over time"
   * monitoring charts. Use `groupBy` to control the time bucket size (hour, day, or week) —
   * defaults to day if not provided. Each point includes the bucket's `startTime`, `endTime`,
   * and incident `count`.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param options - Optional settings for time bucketing granularity and filters
   * @returns Promise resolving to an array of {@link IncidentTimelinePoint}
   *
   * @example
   * ```typescript
   * // Get daily incident counts for the last 30 days
   * const now = new Date();
   * const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
   * const timeline = await cases.getIncidentsTimeline(thirtyDaysAgo, now);
   *
   * for (const point of timeline) {
   *   console.log(`${point.startTime} — ${point.count} incidents`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { TimeInterval } from '@uipath/uipath-typescript/cases';
   *
   * // Get a weekly breakdown filtered to a single process
   * const timeline = await cases.getIncidentsTimeline(startTime, endTime, {
   *   groupBy: TimeInterval.Week,
   *   processKey: '<processKey>',
   * });
   * ```
   */
  getIncidentsTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<IncidentTimelinePoint[]>;

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
   * @param processKey - Process key to filter by
   * @param packageId - Package identifier
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
   * @param packageVersion - Package version to filter by
   * @returns Promise resolving to an array of {@link ElementStats}
   * @example
   * ```typescript
   * // Get element metrics for a case
   * const elements = await cases.getElementStats(
   *   '<processKey>',
   *   '<packageId>',
   *   new Date('2026-04-01'),
   *   new Date(),
   *   '1.0.1'
   * );
   *
   * // Find elements with failures
   * const failedElements = elements.filter(e => e.failCount > 0);
   * for (const element of failedElements) {
   *   console.log(`Failed element: ${element.elementId}, failures: ${element.failCount}`);
   * }
   * ```
   */
  getElementStats(processKey: string, packageId: string, startTime: Date, endTime: Date, packageVersion: string): Promise<ElementStats[]>;
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

      return service.getElementStats(caseData.processKey, caseData.packageId, startTime, endTime, packageVersion);
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
