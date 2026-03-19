/**
 * Default pagination settings for tenant API
 */
export const TENANT_PAGINATION = {
  /** Default page size for tenant listing */
  DEFAULT_PAGE_SIZE: 100,
  /** Field name for items array in response */
  ITEMS_FIELD: 'items',
  /** Field name for total count in response */
  TOTAL_COUNT_FIELD: 'totalRecordCount',
} as const;

/**
 * Pagination parameter names for tenant API
 */
export const TENANT_PAGINATION_PARAMS = {
  /** Parameter name for page size */
  PAGE_SIZE_PARAM: 'pageSize',
  /** Parameter name for page index */
  PAGE_INDEX_PARAM: 'pageIndex',
  /** Parameter name for search term */
  SEARCH_TERM_PARAM: 'searchTerm',
} as const;
