/**
 * Constants used throughout the pagination system
 */

/** Maximum number of items that can be requested in a single page */
export const MAX_PAGE_SIZE = 1000;

/** Default page size when jumpToPage is used without specifying pageSize */
export const DEFAULT_PAGE_SIZE = 50;

/** Default field name for items in a paginated response */
export const DEFAULT_ITEMS_FIELD = 'value';

/** Default field name for total count in a paginated response */
export const DEFAULT_TOTAL_COUNT_FIELD = '@odata.count';

/**
 * Limits the page size to the maximum allowed value
 * @param pageSize - Requested page size
 * @returns Limited page size value
 */
export function getLimitedPageSize(pageSize?: number): number {
  if (pageSize === undefined || pageSize === null) {
    return DEFAULT_PAGE_SIZE;
  }
  return Math.max(1, Math.min(pageSize, MAX_PAGE_SIZE));
}