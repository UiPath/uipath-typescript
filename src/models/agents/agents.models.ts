import type {
  AgentGetConsumptionTimelineOptions,
  AgentGetConsumptionTimelineResponse,
  AgentError,
  AgentGetErrorsOptions,
  AgentGetErrorsTimelineOptions,
  AgentGetErrorsTimelineResponse,
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
  AgentGetUnitConsumptionSummaryOptions,
  AgentGetUnitConsumptionSummaryResponse,
  AgentListItem,
  AgentGetAllOptions,
} from './agents.types';
import type {
  HasPaginationOptions,
  NonPaginatedResponse,
  PaginatedResponse,
} from '../../utils/pagination/types';

/**
 * Service for retrieving runtime data for UiPath Agents.
 *
 * UiPath Agents are AI-driven automations powered by large language models
 * and machine learning that plan, make decisions, and execute tasks in
 * dynamic environments.
 *
 * See [About Agents](https://docs.uipath.com/agents/automation-cloud/latest/user-guide/about-agents)
 * for an overview of UiPath Agents.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Agents } from '@uipath/uipath-typescript/agents';
 *
 * const agents = new Agents(sdk);
 * const list = await agents.getAll(
 *   new Date('2025-01-01T00:00:00Z'),
 *   new Date('2025-02-01T00:00:00Z'),
 * );
 * ```
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
  getAll<T extends AgentGetAllOptions = AgentGetAllOptions>(
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
  getErrors<T extends AgentGetErrorsOptions = AgentGetErrorsOptions>(
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
  getErrorsTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentGetErrorsTimelineOptions,
  ): Promise<AgentGetErrorsTimelineResponse[]>;

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
  getConsumptionTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentGetConsumptionTimelineOptions,
  ): Promise<AgentGetConsumptionTimelineResponse[]>;

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
  getLatencyTimeline(
    startTime: Date,
    endTime: Date,
    options?: AgentGetLatencyTimelineOptions,
  ): Promise<AgentGetLatencyTimelineResponse[]>;

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
  getTopErrorCount(
    startTime: Date,
    endTime: Date,
    options?: AgentGetTopErrorCountOptions,
  ): Promise<AgentGetTopErrorCountResponse>;

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
   * result.agents.forEach((agent) => {
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
  getTopConsumption(
    startTime: Date,
    endTime: Date,
    options?: AgentGetTopConsumptionOptions,
  ): Promise<AgentGetTopConsumptionResponse>;

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
  getIncidentDistribution(
    startTime: Date,
    endTime: Date,
    options?: AgentGetIncidentDistributionOptions,
  ): Promise<AgentGetIncidentDistributionResponse>;

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
   * console.log(`Success rate: ${result.currentPeriodSummary.successRate}%`);
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
  getSummary(
    startTime: Date,
    endTime: Date,
    options?: AgentGetSummaryOptions,
  ): Promise<AgentGetSummaryResponse>;

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
   * console.log(`Agent Units complete jobs: ${result.currentPeriodSummary.totalAgentUnitConsumption.completeJobs}`);
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
  getUnitConsumptionSummary(
    startTime: Date,
    endTime: Date,
    options?: AgentGetUnitConsumptionSummaryOptions,
  ): Promise<AgentGetUnitConsumptionSummaryResponse>;
}
