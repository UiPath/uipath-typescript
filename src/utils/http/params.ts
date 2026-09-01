import type { QueryParams } from '../../models/common/request-spec';

/**
 * Creates query parameters object from key-value pairs, filtering out undefined values
 * @param paramsObj - Object containing parameter key-value pairs
 * @returns Parameters object with undefined values filtered out
 * 
 * @example
 * ```typescript
 * // Entity service parameters
 * const params = createParams({
 *   start: 0,
 *   limit: 10,
 *   expansionLevel: 1
 * });
 * 
 * // With optional/undefined values (automatically filtered)
 * const params = createParams({
 *   start: options.start,        // Could be undefined
 *   limit: options.limit,        // Could be undefined
 *   expansionLevel: options.expansionLevel  // Could be undefined
 * });
 * 
 * // Empty params
 * const params = createParams();
 * ```
 */
export function createParams(paramsObj: Record<string, string | number | boolean | undefined> = {}): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(paramsObj)) {
    if (value !== undefined && value !== null) {
      params[key] = value;
    }
  }

  return params;
}

/**
 * Serializes query parameters into a `URLSearchParams`.
 *
 * Array values are appended as repeated parameters (`key=a&key=b`) rather than a single
 * comma-joined value, which APIs expecting a collection reject.
 *
 * @param params - Query parameters to serialize
 * @returns The serialized search parameters
 */
export function toSearchParams(params?: QueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (!params) return searchParams;

  for (const [key, value] of Object.entries(params)) {
    // A null/undefined value is legal here and means "omit this key", not "?key=null".
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        // Elements are typed non-null, so this only guards untyped callers.
        if (item !== undefined && item !== null) searchParams.append(key, String(item));
      });
    } else {
      searchParams.append(key, String(value));
    }
  }

  return searchParams;
}

/**
 * Appends serialized query parameters to a URL, leaving the URL untouched when there are none.
 *
 * @param url - Base URL
 * @param params - Query parameters to append
 * @returns The URL with a query string when parameters were supplied
 */
export function appendSearchParams(url: string, params?: QueryParams): string {
  const query = toSearchParams(params).toString();
  if (!query) return url;
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`;
}