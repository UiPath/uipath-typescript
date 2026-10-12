/**
 * Case Explore Types
 * Types for the case management explore query, which aggregates case and element runs.
 */

/**
 * Kind of a filter in a case explore query.
 *
 * @experimental
 */
export enum CaseExploreFilterKind {
  /** Matches rows whose field equals one of the given values */
  Value = 'ValueFilter',
  /** Matches rows whose field starts with the given pattern */
  Search = 'SearchFilter',
}

/**
 * Sort direction for a case explore query.
 *
 * @experimental
 */
export enum CaseExploreSortDirection {
  Ascending = 'asc',
  Descending = 'desc',
}

/**
 * Matches rows whose field equals one of `values`.
 *
 * @experimental
 */
export interface CaseExploreValueFilter {
  kind: CaseExploreFilterKind.Value;
  /** Field id, e.g. `PROCESSRUNS.STATUS` */
  field: string;
  /** Values to match. Compared as strings, so a flag such as `ISLATEST` is matched with `'1'` */
  values: string[];
}

/**
 * Matches rows whose field starts with `pattern`.
 *
 * @experimental
 */
export interface CaseExploreSearchFilter {
  kind: CaseExploreFilterKind.Search;
  /** Field id, e.g. `PROCESSRUNS.CASETITLE` */
  field: string;
  /** Prefix to match */
  pattern: string;
}

/**
 * A filter in a case explore query.
 *
 * @experimental
 */
export type CaseExploreFilter = CaseExploreValueFilter | CaseExploreSearchFilter;

/**
 * Orders the result by a field.
 *
 * @experimental
 */
export interface CaseExploreSort {
  /** Field id, or the `id` of an aggregate in the same query */
  field: string;
  direction: CaseExploreSortDirection;
}

/**
 * A stored measure computed per group.
 *
 * @experimental
 */
export interface CaseExploreAggregate {
  /** Key the measure is returned under in each row */
  id: string;
  /** Stored measure name, e.g. `PROCESSRUNS.CASE_COUNT` or `ELEMENTRUNS.TASK_COUNT` */
  measureRef: string;
}

/**
 * A case explore query.
 *
 * Field ids are `<TABLE>.<COLUMN>`: `PROCESSRUNS` holds one row per case status change and
 * `ELEMENTRUNS` one row per stage or task status change, so filter `ISLATEST` to `'1'` to read
 * only the current state.
 *
 * @experimental
 */
export interface CaseExploreQuery {
  /** Field ids to group by. Each distinct combination is one row */
  groupBy: string[];
  /** Measures to compute per group */
  aggregates?: CaseExploreAggregate[];
  /** Outer array is OR groups, inner array is AND within a group */
  filters?: CaseExploreFilter[][];
  /** Sort order, applied in sequence */
  sort?: CaseExploreSort[];
  /** Maximum rows to return. Ignored when paginating — `pageSize` takes its place */
  limit?: number;
}

/**
 * One row of a case explore result, keyed by field id or aggregate `id`.
 * A field the tenant's schema does not carry is absent.
 *
 * @experimental
 */
export interface CaseExploreResponse {
  [fieldId: string]: string | number | boolean | null;
}
