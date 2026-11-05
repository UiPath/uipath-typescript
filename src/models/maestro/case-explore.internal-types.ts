/**
 * Internal types for the case explore query
 */

import type { CaseExploreFilterKind, CaseExploreSortDirection } from './case-explore.types';

/** Value type of a value filter. The engine matches values as strings. */
export enum CaseExploreValueType {
  StringValues = 'StringValues',
}

/** Match type of a search filter. Prefix match is the engine's only one. */
export enum CaseExploreSearchType {
  StartsWith = 'StartsWith',
}

/** Cell values as the query engine returns them. */
export type RawCaseExploreValue = string | number | boolean | null;

/** One column of a result. Row N is the Nth entry of every column's `values`. */
export interface RawCaseExploreColumn {
  values: RawCaseExploreValue[] | null;
  ungrouped: unknown;
  stackValues: unknown;
}

/** A result, keyed by field id or aggregate id. */
export type RawCaseExploreColumns = Record<string, RawCaseExploreColumn | undefined>;

/** Page state the engine reports when `page` and `pageSize` are sent. */
export interface RawCaseExplorePagination {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** A paginated result: the columns move under `data`. */
export interface RawCaseExplorePagedResponse {
  data: RawCaseExploreColumns;
  pagination: RawCaseExplorePagination;
}

/** A value filter as the engine reads it. */
export interface RawCaseExploreValueFilter {
  Kind: CaseExploreFilterKind.Value;
  Type: CaseExploreValueType.StringValues;
  Dimension: string;
  Values: string[];
}

/** A search filter as the engine reads it. */
export interface RawCaseExploreSearchFilter {
  Kind: CaseExploreFilterKind.Search;
  Dimension: string;
  Pattern: string;
  FilterType: CaseExploreSearchType.StartsWith;
}

/** The request body as the engine reads it. */
export interface RawCaseExploreQuery {
  groupBy: string[];
  aggregates: { id: string; measureRef: string }[];
  filters: (RawCaseExploreValueFilter | RawCaseExploreSearchFilter)[][];
  sort: { Field: string; Direction: CaseExploreSortDirection }[];
  limit?: number;
}
