/**
 * Maestro Cases Models
 * Model classes for Maestro cases
 */

import { CaseGetAllResponse, CaseGetTopRunCountResponse } from './cases.types';
import { InstanceStatusTimelineResponse, MaestroInsightsOptions } from './insights.types';

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
   * @returns Promise resolving to array of Case objects
   * {@link CaseGetAllResponse}
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
  getAll(): Promise<CaseGetAllResponse[]>;

  /**
   * Get the top 5 case processes ranked by run count within a time range.
   *
   * Returns an array of up to 5 case processes sorted by how many times they were executed,
   * useful for identifying the most active case processes in a given period.
   *
   * @param startTime - Start of the time range to query
   * @param endTime - End of the time range to query
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
   */
  getTopRunCount(startTime: Date, endTime: Date): Promise<CaseGetTopRunCountResponse[]>;

  /**
   * Get instance status counts aggregated by date for case management processes.
   *
   * Returns time-bucketed counts of case instances grouped by status (Completed, Faulted, Cancelled),
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
   * const statuses = await cases.getInstanceStatusTimeline(sevenDaysAgo, now);
   *
   * for (const entry of statuses) {
   *   console.log(`${entry.startTime} — ${entry.status}: ${entry.count}`);
   * }
   * ```
   *
   * @example
   * ```typescript
   * import { TimeSliceUnit } from '@uipath/uipath-typescript/cases';
   *
   * // Get weekly breakdown
   * const statuses = await cases.getInstanceStatusTimeline(startTime, endTime, {
   *   timeSliceUnit: TimeSliceUnit.Week,
   * });
   * ```
   */
  getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: MaestroInsightsOptions,
  ): Promise<InstanceStatusTimelineResponse[]>;
}
