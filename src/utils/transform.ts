/**
 * Type for field mapping configuration
 * Maps source field names to target field names
 */
export type FieldMapping = {
  [sourceField: string]: string;
};

/**
 * Transforms data by mapping fields according to the provided field mapping
 * @param data The source data to transform
 * @param fieldMapping Object mapping source field names to target field names
 * @returns Transformed data with mapped field names
 * 
 * @example
 * ```typescript
 * // Single object transformation
 * const data = { id: '123', userName: 'john' };
 * const mapping = { id: 'userId', userName: 'name' };
 * const result = transformData(data, mapping);
 * // result = { userId: '123', name: 'john' }
 * 
 * // Array transformation
 * const dataArray = [
 *   { id: '123', userName: 'john' },
 *   { id: '456', userName: 'jane' }
 * ];
 * const result = transformData(dataArray, mapping);
 * // result = [
 * //   { userId: '123', name: 'john' },
 * //   { userId: '456', name: 'jane' }
 * // ]
 * ```
 */
export function transformData<T extends object>(
  data: T | T[],
  fieldMapping: FieldMapping
): T {
  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => transformData(item, fieldMapping)) as unknown as T;
  }

  // Handle single object
  const result = { ...data };
  
  for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
    if (sourceField in result) {
      const value = result[sourceField as keyof T];
      delete result[sourceField as keyof T];
      (result as any)[targetField] = value;
    }
  }

  return result;
}

/**
 * Creates a transform function with predefined field mappings
 * @param fieldMapping Object mapping source field names to target field names
 * @returns Function that transforms data using the provided field mapping
 * 
 * @example
 * ```typescript
 * // Create a reusable transform function
 * const transformUser = createTransform({
 *   id: 'userId',
 *   userName: 'name'
 * });
 * 
 * // Use the transform function
 * const user = transformUser({ id: '123', userName: 'john' });
 * // user = { userId: '123', name: 'john' }
 * 
 * // Transform an array of users
 * const users = transformUser([
 *   { id: '123', userName: 'john' },
 *   { id: '456', userName: 'jane' }
 * ]);
 * ```
 */
export function createTransform<T extends object>(fieldMapping: FieldMapping) {
  return (data: T | T[]): T => transformData(data, fieldMapping);
} 