import { BaseService } from '../base';
import {
  AgentConsumptionTimelineOptions,
  AgentConsumptionTimelineResponse,
  AgentError,
  AgentErrorsOptions,
  AgentErrorsTimelineOptions,
  AgentErrorsTimelineResponse,
  AgentFilterOptions,
  AgentLatencyTimelineOptions,
  AgentLatencyTimelineResponse,
  AgentListItem,
  AgentListOptions,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
import {
  HTTP_METHODS,
  AGENTS_PAGINATION,
  AGENTS_INCIDENTS_PAGINATION,
  AGENTS_OFFSET_PARAMS,
} from '../../utils/constants/common';
import { track } from '../../core/telemetry';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationType } from '../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

/**
 * Service for interacting with the UiPath Agents API.
 */
export class AgentService extends BaseService implements AgentServiceModel {
  /**
   * Retrieves the list of agents on the tenant with consumption and health
   * metadata over the requested window.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional pagination, sort, and filters
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentListItem}
   * @example
   * ```typescript
   * import { Agents, AgentListSortColumn } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Non-paginated — returns the server default page
   * const result = await agents.getAll(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   * );
   * result.items.forEach((agent) => {
   *   console.log(`${agent.agentName} — ${agent.unitsQuantity} units, health=${agent.healthScore}`);
   * });
   *
   * // Paginated — sorted by health score descending
   * const page = await agents.getAll(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   *   {
   *     pageSize: 25,
   *     orderBy: { column: AgentListSortColumn.HealthScore, desc: true },
   *     folderKeys: ['<folderKey1>'],
   *   },
   * );
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getAll(
   *     new Date('2025-05-01T00:00:00Z'),
   *     new Date('2026-05-14T00:00:00Z'),
   *     { cursor: page.nextCursor },
   *   );
   * }
   * ```
   */
  @track('Agents.GetAll')
  async getAll<T extends AgentListOptions = AgentListOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentListItem>
      : NonPaginatedResponse<AgentListItem>
  > {
    const apiOptions = { ...options, startTime: startTime.toISOString(), endTime: endTime.toISOString() };

    return PaginationHelpers.getAll<typeof apiOptions, AgentListItem>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_AGENTS,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AGENTS_PAGINATION.ITEMS_FIELD,
        totalCountField: AGENTS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AGENTS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AGENTS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AGENTS_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<AgentListItem>
        : NonPaginatedResponse<AgentListItem>
    >;
  }

  /**
   * Retrieves agent errors (error-classes observed for agents) over the
   * requested window.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional pagination, sort/group, and filters
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentError}
   * @example
   * ```typescript
   * import { Agents, AgentErrorSortColumn } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Non-paginated — errors in the window
   * const result = await agents.getErrors(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   * );
   * result.items.forEach((error) => {
   *   console.log(`${error.type}: ${error.description} (count=${error.count})`);
   * });
   *
   * // Paginated — sorted by execution count descending
   * const page = await agents.getErrors(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2026-05-14T00:00:00Z'),
   *   {
   *     pageSize: 25,
   *     orderBy: { column: AgentErrorSortColumn.ExecutionCount, desc: true },
   *   },
   * );
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getErrors(
   *     new Date('2025-05-01T00:00:00Z'),
   *     new Date('2026-05-14T00:00:00Z'),
   *     { cursor: page.nextCursor },
   *   );
   * }
   * ```
   */
  @track('Agents.GetErrors')
  async getErrors<T extends AgentErrorsOptions = AgentErrorsOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentError>
      : NonPaginatedResponse<AgentError>
  > {
    const apiOptions = { ...options, startTime: startTime.toISOString(), endTime: endTime.toISOString() };

    return PaginationHelpers.getAll<typeof apiOptions, AgentError>({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => AGENTS_ENDPOINTS.GET_INCIDENTS,
      method: HTTP_METHODS.POST,
      excludeFromPrefix: Object.keys(apiOptions),
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: AGENTS_INCIDENTS_PAGINATION.ITEMS_FIELD,
        totalCountField: AGENTS_INCIDENTS_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: AGENTS_OFFSET_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: AGENTS_OFFSET_PARAMS.OFFSET_PARAM,
          countParam: AGENTS_OFFSET_PARAMS.COUNT_PARAM,
          convertToSkip: false,
          zeroBased: true,
        },
      },
    }, apiOptions) as Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<AgentError>
        : NonPaginatedResponse<AgentError>
    >;
  }

  /**
   * Retrieves a time-series of error counts grouped by agent over the requested window.
   *
   * Returns one data point per (agent, time bucket). Bucket size is chosen
   * server-side based on the window length. Optionally filter by folder, agent
   * name, project, or process version.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters {@link AgentErrorsTimelineOptions}
   * @returns Promise resolving to {@link AgentErrorsTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // All errors in May 2025
   * const result = await agents.getErrorsTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and top 5 agents
   * const result = await agents.getErrorsTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentNames: ['JokeAgent', 'StoryAgent'],
   *     limit: 5,
   *   },
   * );
   * ```
   */
  @track('Agents.GetErrorsTimeline')
  async getErrorsTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentErrorsTimelineOptions,
  ): Promise<AgentErrorsTimelineResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentErrorsTimelineResponse>(
      AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
      body,
    );

    return response.data;
  }

  /**
   * Retrieves a time-series of AGU consumption over the requested window.
   *
   * Returns one data point per time bucket; bucket size is chosen server-side
   * based on the window length. Optionally filter by folder, agent, project,
   * or process version.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters {@link AgentConsumptionTimelineOptions}
   * @returns Promise resolving to {@link AgentConsumptionTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // AGU consumption timeline in May 2025
   * const result = await agents.getConsumptionTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.timeSlice}: ${point.aguConsumption} AGU`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and agents
   * const result = await agents.getConsumptionTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentNames: ['JokeAgent'],
   *   },
   * );
   * ```
   */
  @track('Agents.GetConsumptionTimeline')
  async getConsumptionTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentConsumptionTimelineOptions,
  ): Promise<AgentConsumptionTimelineResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentConsumptionTimelineResponse>(
      AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE,
      body,
    );

    return response.data;
  }

  /**
   * Retrieves a time-series of agent latency (milliseconds) over the requested
   * window.
   *
   * The API emits one row per percentile per time bucket — typically a P50 row
   * and a P95 row per bucket. Bucket size is chosen server-side based on the
   * window length. Optionally filter by folder, agent, project, or process
   * version.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters {@link AgentLatencyTimelineOptions}
   * @returns Promise resolving to {@link AgentLatencyTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Latency timeline in May 2025
   * const result = await agents.getLatencyTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} ms`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and a single agent
   * const result = await agents.getLatencyTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentId: '<agentId>',
   *   },
   * );
   * ```
   */
  @track('Agents.GetLatencyTimeline')
  async getLatencyTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentLatencyTimelineOptions,
  ): Promise<AgentLatencyTimelineResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentLatencyTimelineResponse>(
      AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE,
      body,
    );

    return response.data;
  }

  /**
   * Builds the common POST request body shared by the agent filter endpoints —
   * the required time window plus any optional folder/agent/project/process
   * filters. Undefined options are omitted so the server applies its defaults.
   */
  private buildAgentFilterBody(
    startTime: Date,
    endTime: Date,
    options?: AgentFilterOptions & { limit?: number },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentNames !== undefined) body.agentNames = options.agentNames;
    if (options?.projectKeys !== undefined) body.projectKeys = options.projectKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.processVersion !== undefined) body.processVersion = options.processVersion;
    if (options?.limit !== undefined) body.limit = options.limit;
    return body;
  }
}
