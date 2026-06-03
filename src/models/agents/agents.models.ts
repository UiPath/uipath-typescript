import type {
  AgentListItem,
  AgentListOptions,
  AgentListTotals,
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
}
