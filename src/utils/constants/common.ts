/**
 * Common constants used across the SDK
 */

/**
 * Prefix used for OData query parameters
 */
export const ODATA_PREFIX = '$';

/**
 * OData pagination constants
 */
export const ODATA_PAGINATION = {
  /** Default field name for items in a paginated OData response */
  ITEMS_FIELD: 'value',
  
  /** Default field name for total count in a paginated OData response */
  TOTAL_COUNT_FIELD: '@odata.count'
};

/**
 * Entity pagination constants for Data Fabric entities
 */
export const ENTITY_PAGINATION = {
  /** Field name for items in entity response */
  ITEMS_FIELD: 'value',
  
  /** Field name for total count in entity response */
  TOTAL_COUNT_FIELD: 'totalRecordCount'
};

/**
 * Bucket pagination constants for token-based pagination
 */
export const BUCKET_PAGINATION = {
  /** Field name for items in bucket file metadata response */
  ITEMS_FIELD: 'items',
  
  /** Field name for continuation token in bucket file metadata response */
  CONTINUATION_TOKEN_FIELD: 'continuationToken'
};

/**
 * Process Instance pagination constants for token-based pagination
 */
export const PROCESS_INSTANCE_PAGINATION = {
  /** Field name for items in process instance response */
  ITEMS_FIELD: 'instances',
  
  /** Field name for continuation token in process instance response */
  CONTINUATION_TOKEN_FIELD: 'nextPage'
};

/**
 * OData OFFSET pagination parameter names (ODATA-style)
 */
export const ODATA_OFFSET_PARAMS = {
  /** OData page size parameter name */
  PAGE_SIZE_PARAM: '$top',
  
  /** OData offset parameter name */
  OFFSET_PARAM: '$skip',
  
  /** OData count parameter name */
  COUNT_PARAM: '$count'
};

/**
 * Entity OFFSET pagination parameter names (limit/start style)
 */
export const ENTITY_OFFSET_PARAMS = {
  /** Entity page size parameter name */
  PAGE_SIZE_PARAM: 'limit',
  
  /** Entity offset parameter name */
  OFFSET_PARAM: 'start',
  
  /** Entity count parameter (not used) */
  COUNT_PARAM: undefined
};

/**
 * Bucket TOKEN pagination parameter names
 */
export const BUCKET_TOKEN_PARAMS = {
  /** Bucket page size parameter name */
  PAGE_SIZE_PARAM: 'takeHint',
  
  /** Bucket token parameter name */
  TOKEN_PARAM: 'continuationToken'
};

/**
 * Process Instance TOKEN pagination parameter names
 */
export const PROCESS_INSTANCE_TOKEN_PARAMS = {
  /** Process instance page size parameter name */
  PAGE_SIZE_PARAM: 'pageSize',
  
  /** Process instance token parameter name */
  TOKEN_PARAM: 'nextPage'
};
