import { CaseGetAllResponse, CaseGetTopRunCountResponse, CaseGetTopFaultedCountResponse, CaseGetTopDurationResponse, GetTopRunCountResponse, GetTopDurationResponse, ElementGetTopFailedCountResponse, IncidentTimelinePoint, InstanceStatusTimelineResponse, ElementStats, InstanceStats } from '../../../models/maestro';
import type { RawElementGetTopFailedCountResponse, RawInstanceStats } from '../../../models/maestro/insights.internal-types';
import { InstanceStatsMap } from '../../../models/maestro/insights.constants';
import { transformData } from '../../../utils/transform';
import type { MaestroProcessStatsRequest, TimelineOptions, TopQueryOptions } from '../../../models/maestro';
import { ProcessType } from '../../../models/maestro/cases.internal-types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { CasesServiceModel } from '../../../models/maestro/cases.models';
import { createCaseWithMethods, CaseGetAllWithMethodsResponse } from '../../../models/maestro/cases.models';
import { buildInsightsTopBody, fetchInstanceStatusTimeline, fetchIncidentsTimeline, buildInsightsCommonBody } from '../insights';
import { BaseService } from '../../base';
import { track } from '../../../core/telemetry';
import { createParams } from '../../../utils/http/params';

/**
 * Service for interacting with UiPath Maestro Cases
 */
export class CasesService extends BaseService implements CasesServiceModel {
  /**
   * Get all case management processes with their instance statistics
   * @returns Promise resolving to an array of {@link CaseGetAllWithMethodsResponse}
   *
   * @example
   * ```typescript
   * import { Cases } from '@uipath/uipath-typescript/cases';
   *
   * const cases = new Cases(sdk);
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
  @track('Cases.GetAll')
  async getAll(): Promise<CaseGetAllWithMethodsResponse[]> {
    const params = createParams({
      processType: ProcessType.CaseManagement
    });

    const response = await this.get<{ processes: Omit<CaseGetAllResponse, 'name'>[] }>(
      MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
      { params }
    );

    // Extract processes array from response data and add name field
    const cases = response.data?.processes || [];
    return cases.map(caseItem => createCaseWithMethods({
      ...caseItem,
      name: this.extractCaseName(caseItem.packageId)
    }, this));
  }

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
  @track('Cases.GetTopRunCount')
  async getTopRunCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopRunCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_RUN_COUNT,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(process => ({ ...process, name: this.extractCaseName(process.packageId) }));
  }

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
  @track('Cases.GetTopElementFailedCount')
  async getTopElementFailedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ElementGetTopFailedCountResponse[]> {
    const { data } = await this.post<RawElementGetTopFailedCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_ELEMENTS_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(item => ({
      elementName: item.elementName,
      elementType: item.elementType,
      processKey: item.processKey,
      failedCount: item.count,
    }));
  }

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
  @track('Cases.GetInstanceStatusTimeline')
  async getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<InstanceStatusTimelineResponse[]> {
    return fetchInstanceStatusTimeline(this.post.bind(this), startTime, endTime, true, options);
  }

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
   * @param options - Optional settings for time bucketing granularity
   * @returns Promise resolving to an array of {@link IncidentTimelinePoint}
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
   */
  @track('Cases.GetIncidentsTimeline')
  async getIncidentsTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<IncidentTimelinePoint[]> {
    return fetchIncidentsTimeline(this.post.bind(this), startTime, endTime, true, options);
  }

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
  @track('Cases.GetTopFaultedCount')
  async getTopFaultedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopFaultedCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(item => ({
      packageId: item.packageId,
      processKey: item.processKey,
      faultedCount: item.runCount,
      name: this.extractCaseName(item.packageId),
    }));
  }

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
  @track('Cases.GetTopExecutionDuration')
  async getTopExecutionDuration(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<CaseGetTopDurationResponse[]> {
    const { data } = await this.post<GetTopDurationResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_DURATION,
      buildInsightsTopBody(startTime, endTime, true, options)
    );
    return (data ?? []).map(process => ({ ...process, name: this.extractCaseName(process.packageId) }));
  }

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
  @track('Cases.GetElementStats')
  async getElementStats(request: MaestroProcessStatsRequest): Promise<ElementStats[]> {
    const { data } = await this.post<ElementStats[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.ELEMENT_COUNT_BY_STATUS,
      buildInsightsCommonBody(request)
    );
    return data ?? [];
  }

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
  @track('Cases.GetInstanceStats')
  async getInstanceStats(request: MaestroProcessStatsRequest): Promise<InstanceStats> {
    const { data } = await this.post<RawInstanceStats>(
      MAESTRO_ENDPOINTS.INSIGHTS.INSTANCE_COUNT_BY_STATUS,
      buildInsightsCommonBody(request)
    );
    return transformData(data, InstanceStatsMap) as unknown as InstanceStats;
  }

  /**
   * Extract a readable case name from the packageId
   * @param packageId - The full package identifier
   * @returns A human-readable case name
   * @private
   */
  private extractCaseName(packageId: string): string {
    // Check if packageId contains "CaseManagement."
    const caseManagementIndex = packageId.indexOf('CaseManagement.');

    if (caseManagementIndex !== -1) {
      // Extract everything after "CaseManagement."
      const afterCaseManagement = packageId.substring(caseManagementIndex + 'CaseManagement.'.length);

      // Replace hyphens with spaces for better readability
      return afterCaseManagement.replace(/-/g, ' ');
    }

    // If no "CaseManagement.", return the whole packageId
    return packageId;
  }
}
