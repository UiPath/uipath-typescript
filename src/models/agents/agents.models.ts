import type {
  AgentNamesGetAllOptions,
  AgentNamesGetAllResponse,
  AgentErrorsTimelineOptions,
  AgentErrorsTimelineResponse,
  AgentTraceErrorsTimelineOptions,
  AgentTraceErrorsTimelineResponse,
  AgentTopErroredAgentsOptions,
  AgentTopErroredAgentsResponse,
  AgentIncident,
  AgentIncidentsOptions,
  AgentIncidentsTotals,
  AgentTopConsumingAgentsOptions,
  AgentTopConsumingAgentsResponse,
  AgentConsumptionTimelineOptions,
  AgentConsumptionTimelineResponse,
  AgentLatencyTimelineOptions,
  AgentLatencyTimelineResponse,
  AgentIncidentDistributionOptions,
  AgentIncidentDistributionResponse,
  AgentListItem,
  AgentListOptions,
  AgentListTotals,
  AgentSummaryOptions,
  AgentSummaryResponse,
  AgentUnitConsumptionSummaryOptions,
  AgentUnitConsumptionSummaryResponse,
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

  /**
   * Retrieves a time-series of agent latency (milliseconds) over the requested
   * window.
   *
   * The API emits one row per percentile per time bucket — typically a P50 row
   * and a P95 row per bucket. Bucket size is chosen server-side based on the
   * window length. Optionally filter by folder, agent, project, or process
   * version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
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
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} ms`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to specific folders and a single agent
   * const result = await agents.getLatencyTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentId: '<agentId>',
   *   },
   * );
   * ```
   */
  getLatencyTimeline(
    startTime: string,
    endTime: string,
    options?: AgentLatencyTimelineOptions,
  ): Promise<AgentLatencyTimelineResponse>;

  /**
   * Retrieves the distribution of incidents across types — errors,
   * escalations, and policy violations — over the requested window.
   *
   * Returns a single aggregate object with one count per incident category.
   * Optionally filter by folder, agent, project, or process version.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters {@link AgentIncidentDistributionOptions}
   * @returns Promise resolving to {@link AgentIncidentDistributionResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Incident distribution in May 2025
   * const result = await agents.getIncidentDistribution(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * console.log(`Errors: ${result.errorCount}`);
   * console.log(`Escalations: ${result.escalationCount}`);
   * console.log(`Policy violations: ${result.policyCount}`);
   * ```
   * @example
   * ```typescript
   * // Scope to a specific folder
   * const result = await agents.getIncidentDistribution(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   { folderKeys: ['<folderKey1>'] },
   * );
   * ```
   */
  getIncidentDistribution(
    startTime: string,
    endTime: string,
    options?: AgentIncidentDistributionOptions,
  ): Promise<AgentIncidentDistributionResponse>;

  /**
   * Retrieves the list of agents on the tenant with consumption and health
   * metadata over the requested window.
   *
   * Returns a {@link PaginatedResponse} when pagination options (`pageSize`,
   * `cursor`, or `jumpToPage`) are provided, otherwise a
   * {@link NonPaginatedResponse}. Both shapes additionally carry the aggregate
   * `totalUnitsConsumed`, `totalAGUnitsConsumed`, and `totalPLTUnitsConsumed`
   * totals via {@link AgentListTotals}.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional pagination, sort, and filters {@link AgentListOptions}
   * @returns Promise resolving to a paginated or non-paginated list of {@link AgentListItem} plus {@link AgentListTotals}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Non-paginated — returns the server default page
   * const result = await agents.getAll(
   *   '2025-05-01T00:00:00Z',
   *   '2026-05-14T00:00:00Z',
   * );
   * console.log(`Total units consumed: ${result.totalUnitsConsumed}`);
   * result.items.forEach((agent) => {
   *   console.log(`${agent.agentName} — ${agent.unitsQuantity} units, health=${agent.healthScore}`);
   * });
   * ```
   * @example
   * ```typescript
   * // Paginated — sorted by health score descending
   * import { AgentListSortColumn } from '@uipath/uipath-typescript/agents';
   *
   * const page = await agents.getAll(
   *   '2025-05-01T00:00:00Z',
   *   '2026-05-14T00:00:00Z',
   *   {
   *     pageSize: 25,
   *     orderBy: { column: AgentListSortColumn.HealthScore, desc: true },
   *     folderKeys: ['<folderKey1>'],
   *   },
   * );
   *
   * if (page.hasNextPage && page.nextCursor) {
   *   const next = await agents.getAll(
   *     '2025-05-01T00:00:00Z',
   *     '2026-05-14T00:00:00Z',
   *     { cursor: page.nextCursor },
   *   );
   * }
   * ```
   */
  getAll<T extends AgentListOptions = AgentListOptions>(
    startTime: string,
    endTime: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentListItem> & AgentListTotals
      : NonPaginatedResponse<AgentListItem> & AgentListTotals
  >;

  /**
   * Retrieves an aggregate per-agent and overall job/success/duration summary
   * for the requested window.
   *
   * Returns aggregate counts (total jobs, successful jobs, success rate,
   * average duration) plus a per-agent breakdown for the current period.
   * When `lookbackPeriodAnalysis: true` is set, the response also includes a
   * `lookbackPeriodSummary` covering the prior window of equal length so the
   * caller can compute deltas.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters and analysis flags {@link AgentSummaryOptions}
   * @returns Promise resolving to {@link AgentSummaryResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Summary in May 2025
   * const result = await agents.getSummary(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * const cur = result.currentPeriodSummary;
   * console.log(`${cur?.totalJobs} jobs, ${cur?.successRate}% success`);
   * cur?.agents.forEach((agent) => {
   *   console.log(`  process=${agent.processKey} totalJobs=${agent.totalJobs} lastStatus=${agent.lastJobStatus}`);
   * });
   * ```
   * @example
   * ```typescript
   * // With lookback period for delta analysis + Runtime-only filter
   * import { AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const result = await agents.getSummary(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     lookbackPeriodAnalysis: true,
   *     folderKey: '<folderKey>',
   *     processKey: '<processKey>',
   *     executionType: AgentExecutionType.Runtime,
   *   },
   * );
   * if (result.lookbackPeriodSummary) {
   *   const delta = (result.currentPeriodSummary?.totalJobs ?? 0)
   *     - result.lookbackPeriodSummary.totalJobs;
   *   console.log(`Job count delta vs prior period: ${delta}`);
   * }
   * ```
   */
  getSummary(
    startTime: string,
    endTime: string,
    options?: AgentSummaryOptions,
  ): Promise<AgentSummaryResponse>;

  /**
   * Retrieves an aggregate AGU/PLTU consumption summary per agent for the
   * requested window.
   *
   * Returns totals for AGU and platform units (split between completed and
   * in-progress jobs) plus a per-agent breakdown for the current period. When
   * `lookbackPeriodAnalysis: true` is set, the response also includes a
   * `lookbackPeriodSummary` covering the prior window of equal length so the
   * caller can compute deltas.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters and analysis flags {@link AgentUnitConsumptionSummaryOptions}
   * @returns Promise resolving to {@link AgentUnitConsumptionSummaryResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Unit consumption in May 2025
   * const result = await agents.getUnitConsumptionSummary(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * const cur = result.currentPeriodSummary;
   * console.log(`Total AGU (complete): ${cur?.totalAgentUnitConsumption.completeJobs}`);
   * console.log(`Total PLTU (complete): ${cur?.totalPlatformUnitConsumption.completeJobs}`);
   * cur?.agentConsumption.forEach((entry) => {
   *   console.log(`  process=${entry.processKey} AGU=${entry.agentUnitConsumption.completeJobs}`);
   * });
   * ```
   * @example
   * ```typescript
   * // With lookback period for delta analysis + Runtime-only filter
   * import { AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const result = await agents.getUnitConsumptionSummary(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     lookbackPeriodAnalysis: true,
   *     executionType: AgentExecutionType.Runtime,
   *   },
   * );
   * if (result.lookbackPeriodSummary) {
   *   const delta = (result.currentPeriodSummary?.totalAgentUnitConsumption.completeJobs ?? 0)
   *     - result.lookbackPeriodSummary.totalAgentUnitConsumption.completeJobs;
   *   console.log(`AGU delta vs prior period: ${delta}`);
   * }
   * ```
   */
  getUnitConsumptionSummary(
    startTime: string,
    endTime: string,
    options?: AgentUnitConsumptionSummaryOptions,
  ): Promise<AgentUnitConsumptionSummaryResponse>;

  /**
   * Retrieves a trace-level time-series of error counts grouped by error name
   * over the requested window.
   *
   * Distinct from {@link AgentServiceModel.getErrorsTimeline}, which counts
   * errors in agent runs (`/Agents/errors`); this counts errors observed in
   * traces. Returns one data point per (error name, time bucket). Bucket size
   * is chosen server-side based on the window length. Optionally filter by
   * folder, agent, agent version, or execution type.
   *
   * @param startTime - Inclusive lower bound for the query window (ISO 8601, UTC)
   * @param endTime - Exclusive upper bound for the query window (ISO 8601, UTC)
   * @param options - Optional filters {@link AgentTraceErrorsTimelineOptions}
   * @returns Promise resolving to {@link AgentTraceErrorsTimelineResponse}
   * @example
   * ```typescript
   * import { Agents } from '@uipath/uipath-typescript/agents';
   *
   * const agents = new Agents(sdk);
   *
   * // Trace-level errors in May 2025
   * const result = await agents.getTraceErrorsTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   * );
   * result.data?.forEach((point) => {
   *   console.log(`${point.date} ${point.name}: ${point.value} errors`);
   * });
   * ```
   * @example
   * ```typescript
   * // Scope to one agent version in specific folders, runtime executions only
   * import { AgentExecutionType } from '@uipath/uipath-typescript/agents';
   *
   * const result = await agents.getTraceErrorsTimeline(
   *   '2025-05-01T00:00:00Z',
   *   '2025-06-01T00:00:00Z',
   *   {
   *     folderKeys: ['<folderKey1>'],
   *     agentId: '<agentId>',
   *     agentVersion: '1.0.0',
   *     executionType: AgentExecutionType.Runtime,
   *   },
   * );
   * ```
   */
  getTraceErrorsTimeline(
    startTime: string,
    endTime: string,
    options?: AgentTraceErrorsTimelineOptions,
  ): Promise<AgentTraceErrorsTimelineResponse>;
}
