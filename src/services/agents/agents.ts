import { BaseService } from '../base';
import {
  AgentGetConsumptionTimelineOptions,
  AgentGetConsumptionTimelineResponse,
  AgentError,
  AgentGetErrorsOptions,
  AgentGetErrorsTimelineOptions,
  AgentGetErrorsTimelineResponse,
  AgentFilterOptions,
  AgentGetLatencyTimelineOptions,
  AgentGetLatencyTimelineResponse,
  AgentGetTopErrorCountOptions,
  AgentGetTopErrorCountResponse,
  AgentGetTopConsumptionOptions,
  AgentGetTopConsumptionResponse,
  AgentGetIncidentDistributionOptions,
  AgentGetIncidentDistributionResponse,
  AgentGetSummaryOptions,
  AgentGetSummaryResponse,
  AgentSummaryPeriod,
  AgentGetUnitConsumptionSummaryOptions,
  AgentGetUnitConsumptionSummaryResponse,
  AgentListItem,
  AgentGetAllOptions,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import type {
  RawAgentGetSummaryResponse,
  RawAgentSummaryPeriod,
} from '../../models/agents/agents.internal-types';
import { JobState } from '../../models/common/types';
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
 * Raw `lastJobStatus` strings the agent-summary API emits that don't match a
 * {@link JobState} value verbatim. `Success` is the API's short label for a
 * successful run, normalized to `Successful`. (`Cancelled` is a canonical
 * JobState value and passes through unchanged — it is not aliased to `Stopped`.)
 */
const JOB_STATUS_ALIASES: Record<string, JobState> = {
  Success: JobState.Successful,
};

const VALID_JOB_STATES = new Set<string>(Object.values(JobState));

/**
 * Permissively maps a raw `lastJobStatus` string to a {@link JobState}. Known
 * aliases are translated first, canonical values pass through, and anything
 * unrecognized falls back to {@link JobState.Unknown} rather than throwing.
 */
function toJobState(raw: string): JobState {
  if (raw in JOB_STATUS_ALIASES) return JOB_STATUS_ALIASES[raw];
  if (VALID_JOB_STATES.has(raw)) return raw as JobState;
  return JobState.Unknown;
}

/**
 * Transforms a raw summary period into the public shape, normalizing every
 * agent's raw `lastJobStatus` string to a {@link JobState}. Tolerates a missing
 * `agents` array (treated as empty).
 */
function normalizeSummaryPeriod(period?: RawAgentSummaryPeriod): AgentSummaryPeriod | undefined {
  if (!period) return period;
  return {
    ...period,
    agents: (period.agents ?? []).map((agent) => ({ ...agent, lastJobStatus: toJobState(agent.lastJobStatus) })),
  };
}

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
  async getAll<T extends AgentGetAllOptions = AgentGetAllOptions>(
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
  async getErrors<T extends AgentGetErrorsOptions = AgentGetErrorsOptions>(
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
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to an array of {@link AgentGetErrorsTimelineResponse}
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
   * result.forEach((point) => {
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
    options?: AgentGetErrorsTimelineOptions,
  ): Promise<AgentGetErrorsTimelineResponse[]> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetErrorsTimelineResponse[] }>(
      AGENTS_ENDPOINTS.GET_ERRORS_TIMELINE,
      body,
    );

    return response.data.data;
  }

  /**
   * Retrieves a time-series of Agent Units consumption over the requested window.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to an array of {@link AgentGetConsumptionTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Agent Units consumption timeline in May 2025
   * const result = await agents.getConsumptionTimeline(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.forEach((point) => {
   *   console.log(`${point.timeSlice}: ${point.aguConsumption} Agent Units`);
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
    options?: AgentGetConsumptionTimelineOptions,
  ): Promise<AgentGetConsumptionTimelineResponse[]> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetConsumptionTimelineResponse[] }>(
      AGENTS_ENDPOINTS.GET_CONSUMPTION_TIMELINE,
      body,
    );

    return response.data.data;
  }

  /**
   * Retrieves a time-series of agent latency (milliseconds) over the requested
   * window.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to an array of {@link AgentGetLatencyTimelineResponse}
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
   * result.forEach((point) => {
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
    options?: AgentGetLatencyTimelineOptions,
  ): Promise<AgentGetLatencyTimelineResponse[]> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data: AgentGetLatencyTimelineResponse[] }>(
      AGENTS_ENDPOINTS.GET_LATENCY_TIMELINE,
      body,
    );

    return response.data.data;
  }

  /**
   * Retrieves the top-N agents ranked by error count over the requested window.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to {@link AgentGetTopErrorCountResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Top agents by error count in May 2025
   * const result = await agents.getTopErrorCount(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * result.data.forEach((agent) => {
   *   console.log(`${agent.name}: ${agent.count} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and top 5 agents
   * const result = await agents.getTopErrorCount(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     limit: 5,
   *   },
   * );
   * ```
   */
  @track('Agents.GetTopErrorCount')
  async getTopErrorCount(
    startTime: Date,
    endTime: Date,
    options?: AgentGetTopErrorCountOptions,
  ): Promise<AgentGetTopErrorCountResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentGetTopErrorCountResponse>(
      AGENTS_ENDPOINTS.GET_TOP_ERROR_COUNT,
      body,
    );

    return response.data;
  }

  /**
   * Retrieves the top-N agents ranked by unit consumption over the requested window.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to {@link AgentGetTopConsumptionResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Top agents by consumption in May 2025
   * const result = await agents.getTopConsumption(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * console.log(`Total consumed: ${result.totalConsumed}`);
   * result.agents?.forEach((agent) => {
   *   console.log(`${agent.agentName}: ${agent.consumedQuantity}`);
   * });
   * ```
   * @example
   * ```typescript
   * import { Agents, AgentType } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Top 5 healthy autonomous agents by consumption
   * const result = await agents.getTopConsumption(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     limit: 5,
   *     healthy: true,
   *     agentTypes: [AgentType.Autonomous],
   *   },
   * );
   * ```
   */
  @track('Agents.GetTopConsumption')
  async getTopConsumption(
    startTime: Date,
    endTime: Date,
    options?: AgentGetTopConsumptionOptions,
  ): Promise<AgentGetTopConsumptionResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.healthy !== undefined) body.healthy = options.healthy;
    if (options?.healthThreshold !== undefined) body.healthThreshold = options.healthThreshold;
    if (options?.agentTypes?.length) body.agentTypes = options.agentTypes.join(',');

    const response = await this.post<{ data?: AgentGetTopConsumptionResponse }>(
      AGENTS_ENDPOINTS.GET_TOP_CONSUMPTION,
      body,
    );

    return response.data.data ?? {};
  }

  /**
   * Retrieves breakdown of agent incidents count — errors, escalations,
   * and policy violations over a requested window.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to {@link AgentGetIncidentDistributionResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Incident distribution in May 2025
   * const result = await agents.getIncidentDistribution(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * console.log(`Errors: ${result.errorCount}, Escalations: ${result.escalationCount}, Policy: ${result.policyCount}`);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agents.getIncidentDistribution(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     folderKeys: ['<folderKey1>'],
   *   },
   * );
   * ```
   */
  @track('Agents.GetIncidentDistribution')
  async getIncidentDistribution(
    startTime: Date,
    endTime: Date,
    options?: AgentGetIncidentDistributionOptions,
  ): Promise<AgentGetIncidentDistributionResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<{ data?: AgentGetIncidentDistributionResponse }>(
      AGENTS_ENDPOINTS.GET_INCIDENT_DISTRIBUTION,
      body,
    );

    return response.data.data ?? {};
  }

  /**
   * Retrieves a job-execution summary for the requested window: overall totals
   * (total jobs, successful jobs, success rate, average duration) alongside a
   * per-agent breakdown. When `lookbackPeriodAnalysis` is enabled, a comparable
   * summary for the preceding window of equal length is included too.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to {@link AgentGetSummaryResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Summary for May 2025
   * const result = await agents.getSummary(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * console.log(`Success rate: ${result.currentPeriodSummary?.successRate}%`);
   * ```
   * @example
   * ```typescript
   * import { Agents, AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Runtime-only summary with lookback comparison
   * const result = await agents.getSummary(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     lookbackPeriodAnalysis: true,
   *     executionType: AgentExecutionType.Runtime,
   *   },
   * );
   * ```
   */
  @track('Agents.GetSummary')
  async getSummary(
    startTime: Date,
    endTime: Date,
    options?: AgentGetSummaryOptions,
  ): Promise<AgentGetSummaryResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.lookbackPeriodAnalysis !== undefined) body.lookbackPeriodAnalysis = options.lookbackPeriodAnalysis;
    if (options?.processKey !== undefined) body.processKey = options.processKey;
    if (options?.folderKey !== undefined) body.folderKey = options.folderKey;
    if (options?.executionType !== undefined) body.executionType = options.executionType;

    const response = await this.post<{ data?: RawAgentGetSummaryResponse }>(
      AGENTS_ENDPOINTS.GET_SUMMARY,
      body,
    );

    const summary = response.data.data;
    if (!summary) return {};

    return {
      ...summary,
      currentPeriodSummary: normalizeSummaryPeriod(summary.currentPeriodSummary),
      lookbackPeriodSummary: normalizeSummaryPeriod(summary.lookbackPeriodSummary),
    };
  }

  /**
   * Retrieves an aggregate Agent Units and Platform Units consumption summary per agent over the
   * requested window.
   *
   * @param startTime - Inclusive lower bound for the query window
   * @param endTime - Exclusive upper bound for the query window
   * @param options - Optional filters
   * @returns Promise resolving to {@link AgentGetUnitConsumptionSummaryResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Unit consumption summary for May 2025
   * const result = await agents.getUnitConsumptionSummary(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   * );
   * console.log(`Agent Units complete jobs: ${result.currentPeriodSummary?.totalAgentUnitConsumption.completeJobs}`);
   * ```
   * @example
   * ```typescript
   * import { Agents, AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Runtime-only summary with lookback comparison
   * const result = await agents.getUnitConsumptionSummary(
   *   new Date('2025-05-01T00:00:00Z'),
   *   new Date('2025-06-01T00:00:00Z'),
   *   {
   *     lookbackPeriodAnalysis: true,
   *     executionType: AgentExecutionType.Runtime,
   *   },
   * );
   * ```
   */
  @track('Agents.GetUnitConsumptionSummary')
  async getUnitConsumptionSummary(
    startTime: Date,
    endTime: Date,
    options?: AgentGetUnitConsumptionSummaryOptions,
  ): Promise<AgentGetUnitConsumptionSummaryResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.lookbackPeriodAnalysis !== undefined) body.lookbackPeriodAnalysis = options.lookbackPeriodAnalysis;
    if (options?.processKey !== undefined) body.processKey = options.processKey;
    if (options?.folderKey !== undefined) body.folderKey = options.folderKey;
    if (options?.executionType !== undefined) body.executionType = options.executionType;

    const response = await this.post<{ data?: AgentGetUnitConsumptionSummaryResponse }>(
      AGENTS_ENDPOINTS.GET_UNIT_CONSUMPTION_SUMMARY,
      body,
    );

    return response.data.data ?? {};
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
