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
