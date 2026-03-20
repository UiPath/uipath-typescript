/**
 * Field mapping for policy response transformations
 * Maps API field names to SDK field names for consistency
 */
export const PolicyMap: Record<string, string> = {
  // Add any field mappings if needed in the future
  // Example: 'ApiFieldName': 'sdkFieldName'
};

/**
 * Default page size for policy pagination
 */
export const DEFAULT_POLICY_PAGE_SIZE = 100;

/**
 * Policy pagination configuration
 */
export const POLICY_PAGINATION = {
  ITEMS_FIELD: 'result',
  TOTAL_COUNT_FIELD: 'totalCount',
} as const;

/**
 * Policy pagination parameters
 */
export const POLICY_PAGINATION_PARAMS = {
  PAGE_SIZE_PARAM: 'pageSize',
  PAGE_INDEX_PARAM: 'pageIndex',
} as const;
