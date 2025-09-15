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