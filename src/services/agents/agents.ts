import { BaseService } from '../base';
import {
  AgentErrorsTimelineOptions,
  AgentErrorsTimelineResponse,
  AgentFilterOptions,
  AgentIncident,
  AgentIncidentsOptions,
  AgentIncidentsTotals,
  AgentNamesGetAllOptions,
  AgentNamesGetAllResponse,
  AgentTopConsumingAgentsOptions,
  AgentTopConsumingAgentsResponse,
  AgentTopErroredAgentsOptions,
  AgentTopErroredAgentsResponse,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
import { camelToPascalCaseKeys } from '../../utils/transform';
import { track } from '../../core/telemetry';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { PaginationManager } from '../../utils/pagination/pagination-manager';
import { PaginationType } from '../../utils/pagination/internal-types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

/**
 * Raw envelope returned by `POST /Agents/incidents` before SDK normalization.
 * Internal — not exported from the agents barrel.
 */
interface RawAgentIncidentsResponse {
  totalErrorCount?: number;
  pagination?: {
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
  };
  data?: AgentIncident[];
}

/**
 * Raw envelope returned by `POST /Agents/consumption` — the SDK unwraps the
 * `data` wrapper before returning to the caller.
 */
interface RawAgentTopConsumingEnvelope {
  data?: AgentTopConsumingAgentsResponse;
}

/**
 * Service for interacting with the UiPath Agents API.
 */
export class AgentService extends BaseService implements AgentServiceModel {
  /**
   * Lists all distinct agent names on the given tenant.
   *
   * The tenant is inferred from the authenticated JWT. Optionally scope the
   * lookup to a list of folder keys.
   *
   * @param options - Optional folder-key scoping {@link AgentNamesGetAllOptions}
   * @returns Promise resolving to {@link AgentNamesGetAllResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // List all agent names on the tenant
   * const result = await agents.getNames();
   * console.log(result.agents);
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders
   * const result = await agents.getNames({
   *   folderKeys: ['<folderKey1>', '<folderKey2>'],
   * });
   * ```
   */
  @track('Agents.GetNames')
  async getNames(options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse> {
    const input: Record<string, unknown> = {};
    if (options?.folderKeys !== undefined) input.folderKeys = options.folderKeys;

    const response = await this.post<AgentNamesGetAllResponse>(
      AGENTS_ENDPOINTS.GET_NAMES,
      camelToPascalCaseKeys(input)
    );

    return response.data;
  }

  /**
   * Retrieves a time-series of error counts grouped by agent over the requested window.
   *
   * Returns one data point per (agent, time bucket). Bucket size is chosen
   * server-side based on the window length. Optionally filter by folder, agent
   * name, project, or process version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
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
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and top 5 agents
   * const result = await agents.getErrorsTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
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
    startTime: string,
    endTime: string,
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
   * Retrieves the top-N agents by error count over the requested window.
   *
   * Returns one entry per agent, ranked by error count, with the first and
   * last failing jobs included to anchor the error window. Optionally filter
   * by folder, agent name, project, or process version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters {@link AgentTopErroredAgentsOptions}
   * @returns Promise resolving to {@link AgentTopErroredAgentsResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Top errored agents in May 2025
   * const result = await agents.getTopErroredAgents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * console.log(`Total errors: ${result.totalErrors}`);
   * result.data?.forEach((agent) => {
   *   console.log(`${agent.name}: ${agent.count} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Top 5 errored agents in specific folders
   * const result = await agents.getTopErroredAgents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     limit: 5,
   *   },
   * );
   * ```
   */
  @track('Agents.GetTopErroredAgents')
  async getTopErroredAgents(
    startTime: string,
    endTime: string,
    options?: AgentTopErroredAgentsOptions,
  ): Promise<AgentTopErroredAgentsResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);

    const response = await this.post<AgentTopErroredAgentsResponse>(
      AGENTS_ENDPOINTS.GET_TOP_ERRORED_AGENTS,
      body,
    );

    return response.data;
  }

  /**
   * Retrieves agent incidents over the requested window.
   *
   * Each incident represents one error class observed for an agent, with a
   * count, first/last seen jobs, and folder context. Returns a
   * {@link PaginatedResponse} when pagination options (`pageSize`, `cursor`,
   * or `jumpToPage`) are provided, otherwise a {@link NonPaginatedResponse}.
   * Both shapes additionally carry `totalErrorCount` — the sum of error
   * executions across the matching incidents.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional pagination, sort, group, and filters {@link AgentIncidentsOptions}
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentIncident} plus {@link AgentIncidentsTotals}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Non-paginated — returns the server default page
   * const result = await agents.getIncidents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * console.log(`Total error count: ${result.totalErrorCount}`);
   * console.log(`Records on this page: ${result.items.length}`);
   * result.items.forEach((incident) => {
   *   console.log(`[${incident.type}] ${incident.description} (count=${incident.count})`);
   * });
   * ```
   * @example
   * ```typescript
   * // Paginated — first page, 25 per page, sorted by execution count desc
   * import { AgentIncidentSortColumn } from '@uipath/uipath-typescript/agents';
   *
   * const page = await agents.getIncidents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     pageSize: 25,
   *     orderBy: { column: AgentIncidentSortColumn.ExecutionCount, desc: true },
   *     folderKeys: ['<folderKey1>'],
   *   },
   * );
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getIncidents(
   *     '2025-05-01T00:00:00Z',
   *     '2025-06-01T00:00:00Z',
   *     { cursor: page.nextCursor },
   *   );
   * }
   * ```
   */
  @track('Agents.GetIncidents')
  async getIncidents<T extends AgentIncidentsOptions = AgentIncidentsOptions>(
    startTime: string,
    endTime: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentIncident> & AgentIncidentsTotals
      : NonPaginatedResponse<AgentIncident> & AgentIncidentsTotals
  > {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.orderBy !== undefined) body.orderBy = options.orderBy;
    if (options?.groupBy !== undefined) body.groupBy = options.groupBy;

    const isPaginated = !!options && PaginationHelpers.hasPaginationParameters(options as Record<string, unknown>);

    // Resolve API-side 0-indexed pageNumber from SDK 1-indexed pagination input.
    let apiPageNumber: number | undefined;
    let pageSize: number | undefined;
    if (options?.cursor) {
      const cursorData = PaginationHelpers.parseCursor(options.cursor.value);
      apiPageNumber = (cursorData.pageNumber ?? 1) - 1;
      pageSize = cursorData.pageSize ?? options.pageSize;
    } else if (options?.jumpToPage !== undefined) {
      apiPageNumber = options.jumpToPage - 1;
      pageSize = options.pageSize;
    } else if (options?.pageSize !== undefined) {
      apiPageNumber = 0;
      pageSize = options.pageSize;
    }
    if (apiPageNumber !== undefined) body.pageNumber = apiPageNumber;
    if (pageSize !== undefined) body.pageSize = pageSize;

    const response = await this.post<RawAgentIncidentsResponse>(
      AGENTS_ENDPOINTS.GET_INCIDENTS,
      body,
    );
    const raw = response.data;
    const items = raw.data ?? [];
    const totalCount = raw.pagination?.totalCount;
    const totalErrorCount = raw.totalErrorCount;

    if (!isPaginated) {
      const nonPaginated: NonPaginatedResponse<AgentIncident> & AgentIncidentsTotals = {
        items,
        totalCount,
        totalErrorCount,
      };
      return nonPaginated as any;
    }

    // Convert API's 0-indexed pageNumber to SDK's 1-indexed currentPage.
    const sdkCurrentPage =
      raw.pagination?.pageNumber !== undefined ? raw.pagination.pageNumber + 1 : undefined;
    const effectivePageSize = raw.pagination?.pageSize ?? pageSize;
    const hasMore =
      totalCount !== undefined && sdkCurrentPage !== undefined && effectivePageSize
        ? sdkCurrentPage * effectivePageSize < totalCount
        : items.length === (effectivePageSize ?? -1);

    const paginated = PaginationManager.createPaginatedResponse<AgentIncident>(
      {
        pageInfo: {
          hasMore,
          totalCount,
          currentPage: sdkCurrentPage,
          pageSize: effectivePageSize,
        },
        type: PaginationType.OFFSET,
      },
      items,
    );
    const withTotals: PaginatedResponse<AgentIncident> & AgentIncidentsTotals = {
      ...paginated,
      totalErrorCount,
    };
    return withTotals as any;
  }

  /**
   * Retrieves the top-N agents by unit consumption over the requested window.
   *
   * Returns aggregate consumption totals plus a ranked list of agents. Use
   * `healthy` / `healthThreshold` to scope by health score, or `agentTypes`
   * to filter by agent kind.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters and limit {@link AgentTopConsumingAgentsOptions}
   * @returns Promise resolving to {@link AgentTopConsumingAgentsResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Top consuming agents in May 2025
   * const result = await agents.getTopConsumingAgents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * console.log(`Total consumed: ${result.totalConsumed}`);
   * result.agents?.forEach((agent) => {
   *   console.log(`${agent.agentName}: ${agent.consumedQuantity} units`);
   * });
   * ```
   * @example
   * ```typescript
   * // Top 5 healthy autonomous + coded agents
   * import { AgentType } from '@uipath/uipath-typescript/agents';
   *
   * const result = await agents.getTopConsumingAgents(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     limit: 5,
   *     healthy: true,
   *     healthThreshold: 80,
   *     agentTypes: [AgentType.Autonomous, AgentType.Coded],
   *   },
   * );
   * ```
   */
  @track('Agents.GetTopConsumingAgents')
  async getTopConsumingAgents(
    startTime: string,
    endTime: string,
    options?: AgentTopConsumingAgentsOptions,
  ): Promise<AgentTopConsumingAgentsResponse> {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.healthy !== undefined) body.healthy = options.healthy;
    if (options?.healthThreshold !== undefined) body.healthThreshold = options.healthThreshold;
    if (options?.agentTypes !== undefined) body.agentTypes = options.agentTypes.join(',');

    const response = await this.post<RawAgentTopConsumingEnvelope>(
      AGENTS_ENDPOINTS.GET_TOP_CONSUMING_AGENTS,
      body,
    );

    return response.data.data ?? {};
  }

  private buildAgentFilterBody(
    startTime: string,
    endTime: string,
    options?: AgentFilterOptions & { limit?: number },
  ): Record<string, unknown> {
    const body: Record<string, unknown> = { startTime, endTime };
    if (options?.folderKeys !== undefined) body.folderKeys = options.folderKeys;
    if (options?.agentNames !== undefined) body.agentNames = options.agentNames;
    if (options?.projectKeys !== undefined) body.projectKeys = options.projectKeys;
    if (options?.agentId !== undefined) body.agentId = options.agentId;
    if (options?.processVersion !== undefined) body.processVersion = options.processVersion;
    if (options?.limit !== undefined) body.limit = options.limit;
    return body;
  }
}
