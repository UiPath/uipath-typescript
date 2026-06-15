import type {
  AgentConsumptionTimelineOptions,
  AgentConsumptionTimelineResponse,
  AgentError,
  AgentErrorsOptions,
  AgentErrorsTimelineOptions,
  AgentErrorsTimelineResponse,
  AgentLatencyTimelineOptions,
  AgentLatencyTimelineResponse,
  AgentListItem,
  AgentListOptions,
} from './agents.types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

/**
 * Service for retrieving runtime data for UiPath Agents.
 *
 * See [About Agents](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/about-agents)
 * for an overview of UiPath Agents.
 */
export interface AgentServiceModel {
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
  getAll<T extends AgentListOptions = AgentListOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentListItem>
      : NonPaginatedResponse<AgentListItem>
  >;

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
  getErrors<T extends AgentErrorsOptions = AgentErrorsOptions>(
    startTime: Date,
    endTime: Date,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentError>
      : NonPaginatedResponse<AgentError>
  >;

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
  getErrorsTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentErrorsTimelineOptions,
  ): Promise<AgentErrorsTimelineResponse>;

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
  getConsumptionTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentConsumptionTimelineOptions,
  ): Promise<AgentConsumptionTimelineResponse>;

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
  getLatencyTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentLatencyTimelineOptions,
  ): Promise<AgentLatencyTimelineResponse>;
}
