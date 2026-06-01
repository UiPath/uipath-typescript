import type {
  AgentNamesGetAllOptions,
  AgentNamesGetAllResponse,
  AgentErrorsTimelineOptions,
  AgentErrorsTimelineResponse,
  AgentTopErroredAgentsOptions,
  AgentTopErroredAgentsResponse,
  AgentIncident,
  AgentIncidentsOptions,
  AgentIncidentsTotals,
  AgentTopConsumingAgentsOptions,
  AgentTopConsumingAgentsResponse,
  AgentConsumptionTimelineOptions,
  AgentConsumptionTimelineResponse,
} from './agents.types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

/**
 * Service for retrieving runtime data for UiPath Agents.
 */
export interface AgentServiceModel {
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
  getNames(options?: AgentNamesGetAllOptions): Promise<AgentNamesGetAllResponse>;

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
  getErrorsTimeline(
    startTime: string,
    endTime: string,
    options?: AgentErrorsTimelineOptions,
  ): Promise<AgentErrorsTimelineResponse>;

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
  getTopErroredAgents(
    startTime: string,
    endTime: string,
    options?: AgentTopErroredAgentsOptions,
  ): Promise<AgentTopErroredAgentsResponse>;

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
  getIncidents<T extends AgentIncidentsOptions = AgentIncidentsOptions>(
    startTime: string,
    endTime: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentIncident> & AgentIncidentsTotals
      : NonPaginatedResponse<AgentIncident> & AgentIncidentsTotals
  >;

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
  getTopConsumingAgents(
    startTime: string,
    endTime: string,
    options?: AgentTopConsumingAgentsOptions,
  ): Promise<AgentTopConsumingAgentsResponse>;

  /**
   * Retrieves a time-series of AGU consumption over the requested window.
   *
   * Returns one data point per time bucket; bucket size is chosen server-side
   * based on the window length. Optionally filter by folder, agent, project,
   * or process version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
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
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.timeSlice}: ${point.aguConsumption} AGU`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and agents
   * const result = await agents.getConsumptionTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentNames: ['JokeAgent'],
   *   },
   * );
   * ```
   */
  getConsumptionTimeline(
    startTime: string,
    endTime: string,
    options?: AgentConsumptionTimelineOptions,
  ): Promise<AgentConsumptionTimelineResponse>;
}
