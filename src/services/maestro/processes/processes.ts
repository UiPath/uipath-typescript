import { MaestroProcessGetAllResponse, ProcessIncidentGetResponse, ProcessGetTopRunCountResponse, ProcessGetTopFaultedCountResponse, ProcessGetTopDurationResponse, GetTopRunCountResponse, GetTopDurationResponse, InstanceStatusTimelineResponse } from '../../../models/maestro';
import type { TimelineOptions, TopQueryOptions } from '../../../models/maestro';
import type { IUiPath } from '../../../core/types';
import { MAESTRO_ENDPOINTS } from '../../../utils/constants/endpoints';
import type { MaestroProcessesServiceModel } from '../../../models/maestro/processes.models';
import { createProcessWithMethods } from '../../../models/maestro/processes.models';
import { buildInsightsTopBody, fetchInstanceStatusTimeline } from '../insights';
import { BpmnHelpers } from './helpers';
import { track } from '../../../core/telemetry';
import { createHeaders } from '../../../utils/http/headers';
import { FOLDER_KEY } from '../../../utils/constants/headers';
import { BaseService } from '../../base';
import { ProcessInstancesService } from './process-instances';

/**
 * Service for interacting with Maestro Processes
 */
export class MaestroProcessesService extends BaseService implements MaestroProcessesServiceModel {
  private processInstancesService: ProcessInstancesService;

  /**
   * Creates an instance of the Maestro Processes service.
   *
   * @param instance - UiPath SDK instance providing authentication and configuration
   */
  constructor(instance: IUiPath) {
    super(instance);
    this.processInstancesService = new ProcessInstancesService(instance);
  }

  /**
   * Get all processes with their instance statistics
   * @returns Promise resolving to array of MaestroProcess objects
   *
   * @example
   * ```typescript
   * import { MaestroProcesses } from '@uipath/uipath-typescript/maestro-processes';
   *
   * const maestroProcesses = new MaestroProcesses(sdk);
   * const processes = await maestroProcesses.getAll();
   *
   * // Access process information
   * for (const process of processes) {
   *   console.log(`Process: ${process.processKey}`);
   *   console.log(`Running instances: ${process.runningCount}`);
   *   console.log(`Faulted instances: ${process.faultedCount}`);
   * }
   * ```
   */
  @track('MaestroProcesses.GetAll')
  async getAll(): Promise<MaestroProcessGetAllResponse[]> {
    const response = await this.get<{ processes: Omit<MaestroProcessGetAllResponse, 'name'>[] }>(
      MAESTRO_ENDPOINTS.PROCESSES.GET_ALL,
    );

    // Extract processes array from response data and add name field
    const processes = response.data?.processes || [];
    const processesWithName = processes.map(process => ({
      ...process,
      name: process.packageId
    }));

    // Add methods to each process
    return processesWithName.map(process => createProcessWithMethods(process, this));
  }

  /**
   * Get incidents for a specific process
   */
  @track('MaestroProcesses.GetIncidents')
  async getIncidents(processKey: string, folderKey: string): Promise<ProcessIncidentGetResponse[]> {
    const rawResponse = await this.get<any[]>(
      MAESTRO_ENDPOINTS.INCIDENTS.GET_BY_PROCESS(processKey),
      {
        headers: createHeaders({ [FOLDER_KEY]: folderKey })
      }
    );

    // Fetch BPMN XML and add element name/type to each incident
    return BpmnHelpers.enrichIncidentsWithBpmnData(rawResponse.data || [], folderKey, this.processInstancesService);
  }

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
  @track('MaestroProcesses.GetTopRunCount')
  async getTopRunCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopRunCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_RUN_COUNT,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(process => ({ ...process, name: process.packageId }));
  }

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
  @track('MaestroProcesses.GetInstanceStatusTimeline')
  async getInstanceStatusTimeline(
    startTime: Date,
    endTime: Date,
    options?: TimelineOptions,
  ): Promise<InstanceStatusTimelineResponse[]> {
    return fetchInstanceStatusTimeline(this.post.bind(this), startTime, endTime, false, options);
  }

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
  @track('MaestroProcesses.GetTopFaultedCount')
  async getTopFaultedCount(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopFaultedCountResponse[]> {
    const { data } = await this.post<GetTopRunCountResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_WITH_FAILURE,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(item => ({
      packageId: item.packageId,
      processKey: item.processKey,
      faultedCount: item.runCount,
      name: item.packageId,
    }));
  }

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
  @track('MaestroProcesses.GetTopExecutionDuration')
  async getTopExecutionDuration(startTime: Date, endTime: Date, options?: TopQueryOptions): Promise<ProcessGetTopDurationResponse[]> {
    const { data } = await this.post<GetTopDurationResponse[]>(
      MAESTRO_ENDPOINTS.INSIGHTS.TOP_PROCESSES_BY_DURATION,
      buildInsightsTopBody(startTime, endTime, false, options)
    );
    return (data ?? []).map(process => ({ ...process, name: process.packageId }));
  }
}
