/**
 * Collection of utility functions for working with objects
 */

import { OperationResponse } from "../models/common";

/**
 * Resolves a field value from an object, supporting both direct keys (e.g., '@odata.count')
 * and dot-separated nested paths (e.g., 'pagination.totalCount').
 * Direct key match takes priority over nested traversal.
 */
export function resolveNestedField(data: Record<string, unknown>, fieldPath: string): unknown {
  if (!data) {
    return undefined;
  }
  if (fieldPath in data) {
    return data[fieldPath];
  }
  if (!fieldPath.includes('.')) {
    return undefined;
  }
  let value: unknown = data;
  for (const part of fieldPath.split('.')) {
    value = (value as Record<string, unknown>)?.[part];
  }
  return value;
}

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

/**
 * Helper function for OData responses that ALWAYS return 200 with array indication
 * Empty array = success, Non-empty array = error
 * Used for task assignment APIs that don't use HTTP status codes for errors
 */
export function processODataArrayResponse<TData, TErrorItem = unknown>(
  oDataResponse: { value: TErrorItem[] },
  successData: TData
): OperationResponse<TData | TErrorItem[]> {
  // Empty array = success
  if (oDataResponse.value.length === 0) {
    return {
      success: true,
      data: successData
    };
  }
  
  // Non-empty array = error details
  return {
    success: false,
    data: oDataResponse.value
  };
}