/**
 * Case explore query mock factories — columnar wire shapes, as the query engine returns them.
 */

import { CASE_EXPLORE_TEST_CONSTANTS as C } from '../constants/case-explore';
import type {
  RawCaseExploreColumns,
  RawCaseExploreColumn,
  RawCaseExplorePagedResponse,
  RawCaseExploreValue,
} from '../../../src/models/maestro/case-explore.internal-types';

export const createRawExploreColumn = (values: RawCaseExploreValue[] | null): RawCaseExploreColumn => ({
  values,
  ungrouped: null,
  stackValues: null,
});

/** Two cases with their status, led by the engine's marker column. */
export const createRawExploreColumns = (overrides: RawCaseExploreColumns = {}): RawCaseExploreColumns => ({
  [C.MARKER_COLUMN]: createRawExploreColumn([]),
  [C.FIELD_CASE_ID]: createRawExploreColumn([C.CASE_ID_1, C.CASE_ID_2]),
  [C.FIELD_STATUS]: createRawExploreColumn([C.STATUS_RUNNING, C.STATUS_COMPLETED]),
  ...overrides,
});

export const createRawExplorePagedResponse = (
  overrides: Partial<RawCaseExplorePagedResponse['pagination']> = {},
  data: RawCaseExploreColumns = createRawExploreColumns()
): RawCaseExplorePagedResponse => ({
  data,
  pagination: {
    page: 1,
    pageSize: C.PAGE_SIZE,
    hasNextPage: true,
    hasPreviousPage: false,
    ...overrides,
  },
});
