import { BaseService } from '../base';
import {
  AgentFilterOptions,
  AgentListItem,
  AgentListOptions,
  AgentListTotals,
} from '../../models/agents/agents.types';
import { AgentServiceModel } from '../../models/agents/agents.models';
import { AGENTS_ENDPOINTS } from '../../utils/constants/endpoints';
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
 * Raw envelope returned by `POST /Agents/agents` — the SDK unwraps the `data`
 * envelope and synthesizes the standard `PaginatedResponse<AgentListItem>`
 * shape from the items + pagination metadata, while preserving the aggregate
 * totals.
 */
interface RawAgentListEnvelope {
  pagination?: {
    totalCount?: number;
    pageNumber?: number;
    pageSize?: number;
  };
  data?: {
    agents?: AgentListItem[];
    totalUnitsConsumed?: number;
    totalAGUnitsConsumed?: number;
    totalPLTUnitsConsumed?: number;
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
  @track('Agents.GetAll')
  async getAll<T extends AgentListOptions = AgentListOptions>(
    startTime: string,
    endTime: string,
    options?: T,
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<AgentListItem> & AgentListTotals
      : NonPaginatedResponse<AgentListItem> & AgentListTotals
  > {
    const body = this.buildAgentFilterBody(startTime, endTime, options);
    if (options?.orderBy !== undefined) body.orderBy = options.orderBy;

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

    const response = await this.post<RawAgentListEnvelope>(
      AGENTS_ENDPOINTS.GET_AGENTS,
      body,
    );
    const raw = response.data;
    const inner = raw.data ?? {};
    const items: AgentListItem[] = inner.agents ?? [];
    const totals: AgentListTotals = {
      totalUnitsConsumed: inner.totalUnitsConsumed,
      totalAGUnitsConsumed: inner.totalAGUnitsConsumed,
      totalPLTUnitsConsumed: inner.totalPLTUnitsConsumed,
    };
    const totalCount = raw.pagination?.totalCount;

    if (!isPaginated) {
      const nonPaginated: NonPaginatedResponse<AgentListItem> & AgentListTotals = {
        items,
        totalCount,
        ...totals,
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

    const paginated = PaginationManager.createPaginatedResponse<AgentListItem>(
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
    const withTotals: PaginatedResponse<AgentListItem> & AgentListTotals = {
      ...paginated,
      ...totals,
    };
    return withTotals as any;
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
