/**
 * Pagination test constants
 */

export const PAGINATION_TEST_CONSTANTS = {
  // Page sizes
  PAGE_SIZE: 10,
  PAGE_SIZE_15: 15,
  PAGE_SIZE_20: 20,

  // Page numbers
  PAGE_NUMBER_1: 1,
  PAGE_NUMBER: 2,
  PAGE_NUMBER_3: 3,

  // Jump to page
  JUMP_TO_PAGE_2: 2,

  // Continuation tokens
  CONTINUATION_TOKEN: 'abc123token',


  // Cursor values
  CURSOR_VALUE_TEST: 'test-cursor',
  CURSOR_VALUE_INVALID: 'invalid-cursor',
  CURSOR_VALUE_INVALID_BASE64: 'not-valid-base64!!!',
  CURSOR_VALUE_INVALID_JSON: 'not valid json{',

  // Field names
  FIELD_RESULTS: 'results',
  FIELD_TOTAL: 'total',
  FIELD_NEXT_TOKEN: 'nextToken',

  // Endpoints
  ENDPOINT_API_ITEMS: '/api/items',
  ENDPOINT_API_FOLDERS_ITEMS: '/api/folders/items',

  // Total counts
  TOTAL_COUNT_0: 0,
  TOTAL_COUNT_1: 1,
  TOTAL_COUNT_2: 2,
  TOTAL_COUNT_100: 100,

  // Filter values
  FILTER_NAME_EQ_TEST: 'name eq "test"',

  // Expand values
  EXPAND_RELATIONS: 'relations',

  // Item IDs and names
  ITEM_ID_1: 1,
  ITEM_ID_2: 2,
  ITEM_NAME_1: 'Item1',
  ITEM_NAME_2: 'Item2',

  // Error messages
  ERROR_INVALID_CURSOR: 'Invalid pagination cursor',
  ERROR_INVALID_CURSOR_FORMAT: 'Invalid pagination cursor format',
  ERROR_CURSOR_MUST_BE_VALID: 'cursor must contain a valid cursor string',
  ERROR_INVALID_CURSOR_MISSING_TYPE: 'Invalid cursor: missing pagination type',
  ERROR_PAGE_SIZE_POSITIVE: 'pageSize must be a positive number',
  ERROR_JUMP_TO_PAGE_POSITIVE: 'jumpToPage must be a positive number',
  ERROR_JUMP_TO_PAGE_NOT_SUPPORTED: 'jumpToPage is not supported for token-based pagination. Use cursor-based navigation instead.',
  ERROR_PAGINATION_TYPE_MISMATCH: 'Pagination type mismatch',

  // Total pages
  TOTAL_PAGES_1: 1,
  TOTAL_PAGES_5: 5,
  TOTAL_PAGES: 10
} as const;
