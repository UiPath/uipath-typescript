import { CaseExploreFilter, CaseExploreFilterKind, CaseExploreQuery, CaseExploreResponse } from '../../../models/maestro/case-explore.types';
import { CaseExploreSearchType, CaseExploreValueType } from '../../../models/maestro/case-explore.internal-types';
import type {
  RawCaseExploreColumns,
  RawCaseExplorePagedResponse,
  RawCaseExploreQuery,
  RawCaseExploreSearchFilter,
  RawCaseExploreValueFilter,
} from '../../../models/maestro/case-explore.internal-types';
import { CASE_EXPLORE_MARKER_PREFIX } from '../../../models/maestro/case-explore.constants';

/**
 * Maps an SDK filter to the shape the query engine reads.
 *
 * @internal
 */
function toWireExploreFilter(filter: CaseExploreFilter): RawCaseExploreValueFilter | RawCaseExploreSearchFilter {
  if (filter.kind === CaseExploreFilterKind.Search) {
    return { Kind: filter.kind, Dimension: filter.field, Pattern: filter.pattern, FilterType: CaseExploreSearchType.StartsWith };
  }
  return { Kind: filter.kind, Type: CaseExploreValueType.StringValues, Dimension: filter.field, Values: [...filter.values] };
}

/**
 * Builds the request body for a case explore query.
 *
 * @param query - The SDK query
 * @param pageSize - Page size when paginating; replaces `limit` so the body and query string agree
 * @returns Request body for the explore endpoint
 * @internal
 */
export function toWireExploreQuery(query: CaseExploreQuery, pageSize?: number): RawCaseExploreQuery {
  const limit = pageSize ?? query.limit;
  return {
    groupBy: [...query.groupBy],
    aggregates: (query.aggregates ?? []).map(({ id, measureRef }) => ({ id, measureRef })),
    filters: (query.filters ?? []).map(group => group.map(toWireExploreFilter)),
    sort: (query.sort ?? []).map(({ field, direction }) => ({ Field: field, Direction: direction })),
    ...(limit !== undefined ? { limit } : {}),
  };
}

/**
 * Zips the engine's columnar result into rows, dropping its marker columns.
 *
 * @param columns - Result keyed by field id, one value array per column
 * @returns One row per index across the columns
 * @internal
 */
export function toExploreRows(columns: RawCaseExploreColumns): CaseExploreResponse[] {
  const entries = Object.entries(columns)
    .filter(([key]) => !key.toLowerCase().startsWith(CASE_EXPLORE_MARKER_PREFIX))
    .map(([key, column]) => [key, column?.values ?? []] as const);
  // Max rather than first column, so a short or absent column cannot under-report the row count.
  const rowCount = entries.reduce((max, [, values]) => Math.max(max, values.length), 0);

  return Array.from({ length: rowCount }, (_, index) => {
    const row: CaseExploreResponse = {};
    for (const [key, values] of entries) {
      row[key] = values[index] ?? null;
    }
    return row;
  });
}

/**
 * Whether a response carries the pagination envelope. The engine answers a bare, empty result
 * when the caller can view no case process, even for a paginated request.
 *
 * @internal
 */
export function isPagedExploreResponse(response: unknown): response is RawCaseExplorePagedResponse {
  if (typeof response !== 'object' || response === null) return false;
  if (!('data' in response) || !('pagination' in response)) return false;
  const { data, pagination } = response;
  return typeof data === 'object' && data !== null
    && typeof pagination === 'object' && pagination !== null
    && 'hasNextPage' in pagination && typeof pagination.hasNextPage === 'boolean'
    && 'pageSize' in pagination && typeof pagination.pageSize === 'number';
}
