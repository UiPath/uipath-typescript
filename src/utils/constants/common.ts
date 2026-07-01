/**
 * Common constants used across the SDK
 */

/**
 * Prefix used for OData query parameters
 */
export const ODATA_PREFIX = '$';

export const UNKNOWN = 'Unknown';

export const NO_INSTANCE = 'no-instance';

/**
 * HTTP methods
 */
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
} as const;

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
 * Choice Set values endpoint pagination constants
 * Note: The API returns items as a JSON string in 'jsonValue' field
 */
export const CHOICESET_VALUES_PAGINATION = {
  /** Field name for items in choice set values response (contains JSON string) */
  ITEMS_FIELD: 'jsonValue',

  /** Field name for total count in choice set values response */
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
 * SLA Summary pagination constants for page-number-based pagination
 */
export const SLA_SUMMARY_PAGINATION = {
  /** Field name for items in SLA summary response */
  ITEMS_FIELD: 'data',

  /** Dot-notation path for total count in nested pagination object */
  TOTAL_COUNT_FIELD: 'pagination.totalCount'
};

/**
 * SLA Summary OFFSET pagination parameter names (page-number style, no skip conversion)
 */
export const SLA_SUMMARY_OFFSET_PARAMS = {
  /** Page size parameter name */
  PAGE_SIZE_PARAM: 'PageSize',

  /** Page number parameter name (sent directly, not converted to skip) */
  OFFSET_PARAM: 'PageNumber',

  /** No count param needed */
  COUNT_PARAM: undefined
};

/**
 * Governance pagination constants for page-number-based pagination
 */
export const GOVERNANCE_PAGINATION = {
  /** Field name for items in governance response */
  ITEMS_FIELD: 'items'
};

/**
 * Governance OFFSET pagination parameter names (page-number style, 0-based, no skip conversion)
 */
export const GOVERNANCE_OFFSET_PARAMS = {
  /** Page size parameter name */
  PAGE_SIZE_PARAM: 'pageSize',

  /** Page number parameter name (sent directly, 0-based) */
  OFFSET_PARAM: 'pageNumber',

  /** No count param needed */
  COUNT_PARAM: undefined
};

/**
 * Agents pagination constants — items and total count are nested under the response envelope
 */
export const AGENTS_PAGINATION = {
  /** Dotted path to the items array in the agents response envelope */
  ITEMS_FIELD: 'data.agents',

  /** Dotted path to the total count in the agents response envelope */
  TOTAL_COUNT_FIELD: 'pagination.totalCount'
};

/**
 * Agents OFFSET pagination parameter names (page-number style, 0-based, no skip conversion)
 */
export const AGENTS_OFFSET_PARAMS = {
  /** Page size parameter name */
  PAGE_SIZE_PARAM: 'pageSize',

  /** Page number parameter name (sent directly, 0-based) */
  OFFSET_PARAM: 'pageNumber',

  /** No count param needed */
  COUNT_PARAM: undefined
};

/**
 * Agents incidents pagination constants — the items array is the `data` field
 * itself, total count is nested under the response envelope. Reuses
 * AGENTS_OFFSET_PARAMS for request params (same 0-based page-number style).
 */
export const AGENTS_INCIDENTS_PAGINATION = {
  /** Dotted path to the items array in the incidents response envelope */
  ITEMS_FIELD: 'data',

  /** Total count path — same envelope location as the agents list. */
  TOTAL_COUNT_FIELD: AGENTS_PAGINATION.TOTAL_COUNT_FIELD
};

/**
 * Traceview spans pagination constants — items sit directly under `data`,
 * total count under the same envelope location as the agents list. Request
 * params reuse {@link AGENTS_OFFSET_PARAMS} (pageSize + 0-based pageNumber).
 */
export const TRACEVIEW_SPANS_PAGINATION = {
  /** Field name for the spans array in the response envelope */
  ITEMS_FIELD: 'data',

  /** Total count path — same envelope location as the agents list. */
  TOTAL_COUNT_FIELD: AGENTS_PAGINATION.TOTAL_COUNT_FIELD
};

/**
 * Governance decisions pagination constants — decision rows sit directly
 * under `items`. This endpoint returns no total-count field, so no
 * `TOTAL_COUNT_FIELD` is defined; `hasNextPage` falls back to page-fullness
 * (a full page implies there may be more). Request params reuse
 * {@link AGENTS_OFFSET_PARAMS} (pageSize + 0-based pageNumber).
 */
export const GOVERNANCE_DECISIONS_PAGINATION = {
  /** Field name for the decision-rows array in the response. */
  ITEMS_FIELD: 'items',
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
 * Feedback category pagination response shape constants
 */
export const FEEDBACK_CATEGORY_PAGINATION = {
  /** Field name for items in feedback category response */
  ITEMS_FIELD: 'categories',

  /** Field name for total count in feedback category response */
  TOTAL_COUNT_FIELD: 'totalCount'
};

/**
 * Feedback OFFSET pagination parameter names (take/skip style)
 */
export const FEEDBACK_OFFSET_PARAMS = {
  /** Feedback page size parameter name */
  PAGE_SIZE_PARAM: 'take',

  /** Feedback offset parameter name */
  OFFSET_PARAM: 'skip',

  /** Feedback count parameter (not used) */
  COUNT_PARAM: undefined
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

/**
 * Conversational Agent pagination constants for cursor-based pagination
 */
export const CONVERSATIONAL_PAGINATION = {
  /** Field name for items in conversational agent response */
  ITEMS_FIELD: 'data',

  /** Field name for cursor in conversational agent response */
  CONTINUATION_TOKEN_FIELD: 'cursor'
};

/**
 * Conversational Agent TOKEN pagination parameter names
 */
export const CONVERSATIONAL_TOKEN_PARAMS = {
  /** Conversational agent page size parameter name */
  PAGE_SIZE_PARAM: 'limit',

  /** Conversational agent cursor parameter name */
  TOKEN_PARAM: 'cursor'
};
