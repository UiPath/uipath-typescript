/**
 * Collection of utility functions for working with objects
 */

/**
 * Filters out undefined values from an object
 * @param obj The source object
 * @returns A new object without undefined values
 * 
 * @example
 * ```typescript
 * // Object with undefined values
 * const options = { 
 *   name: 'test',
 *   count: 5,
 *   prefix: undefined,
 *   suffix: null
 * };
 * const result = filterUndefined(options);
 * // result = { name: 'test', count: 5, suffix: null }
 * ```
 */
export function filterUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key as keyof T] = value;
    }
  }
  
  return result;
} 