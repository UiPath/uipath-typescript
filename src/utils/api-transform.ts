/**
 * Unwraps a nested array response to return the array directly
 * @param key The key containing the array in the response
 * @returns A function that extracts the array from the response
 * 
 * @example
 * ```typescript
 * // API returns { items: T[] }
 * const unwrapItems = unwrapArrayResponse<ItemType>('items');
 * const items = unwrapItems(response); // returns T[]
 * ```
 */
export function unwrapArrayResponse<T>(key: string) {
  return <R extends Record<string, any>>(response: R): T[] => {
    return response[key] || [];
  };
}

/**
 * Groups multiple fields under a new object key
 * @param fields Object mapping source fields to their new names under the group
 * @param groupName Name of the group to create
 * @returns A function that transforms the input object
 * 
 * @example
 * ```typescript
 * const groupCounts = groupFields({
 *   runningCount: 'running',
 *   completedCount: 'completed'
 * }, 'counts');
 * 
 * const result = groupCounts({
 *   runningCount: 5,
 *   completedCount: 10
 * });
 * // result = { counts: { running: 5, completed: 10 } }
 * ```
 */
export function groupFields<T extends object, K extends keyof T>(
  fields: { [key: string]: string },
  groupName: string
) {
  return (data: T): Partial<T> & { [key: string]: any } => {
    const result: any = { ...data };
    const group: { [key: string]: any } = {};

    for (const [sourceField, targetField] of Object.entries(fields)) {
      if (sourceField in result) {
        group[targetField] = result[sourceField];
        delete result[sourceField];
      }
    }

    result[groupName] = group;
    return result;
  };
}

/**
 * Chains multiple transform functions together
 * @param transforms Array of transform functions to apply
 * @returns A function that applies all transforms in sequence
 * 
 * @example
 * ```typescript
 * const transform = chainTransforms([
 *   unwrapArrayResponse('items'),
 *   groupFields({ count: 'total' }, 'stats')
 * ]);
 * 
 * const result = transform(response);
 * ```
 */
export function chainTransforms<T>(transforms: ((data: any) => any)[]) {
  return (data: T): any => {
    return transforms.reduce((result, transform) => transform(result), data);
  };
}

/**
 * Creates a transform function that maps array items
 * @param itemTransform Transform function to apply to each item
 * @returns A function that transforms an array of items
 * 
 * @example
 * ```typescript
 * const transformItems = mapArrayItems((item: RawItem): Item => ({
 *   id: item.id,
 *   name: item.displayName
 * }));
 * 
 * const items = transformItems(rawItems);
 * ```
 */
export function _mapArrayItems<T, R>(itemTransform: (item: T) => R) {
  return (items: T[]): R[] => {
    return items.map(itemTransform);
  };
}

/**
 * Combines unwrapping an array response and mapping its items
 * @param key The key containing the array in the response
 * @param itemTransform Transform function to apply to each item
 * @returns A function that extracts and transforms the array
 * 
 * @example
 * ```typescript
 * const transform = unwrapAndMapResponse(
 *   'processes',
 *   (process: RawProcess): Process => ({
 *     id: process.id,
 *     name: process.displayName
 *   })
 * );
 * 
 * const processes = transform(response);
 * ```
 */
export function unwrapAndMapResponse<T, R>(
  key: string,
  itemTransform: (item: T) => R
) {
  return chainTransforms([
    unwrapArrayResponse<T>(key),
    _mapArrayItems(itemTransform)
  ]);
}

/**
 * Transforms data by grouping specified fields and automatically preserving all other fields
 * @param data The raw data to transform
 * @param groupConfig Configuration for grouping fields
 * @returns Transformed data with grouped fields and all other fields preserved
 * 
 * @example
 * ```typescript
 * const result = transformWithGrouping(
 *   rawData,
 *   {
 *     groupName: 'instanceCounts',
 *     fields: {
 *       pendingCount: 'pending',
 *       runningCount: 'running',
 *       completedCount: 'completed'
 *     }
 *   }
 * );
 * // result = {
 * //   processKey: 'key123',      // automatically preserved
 * //   packageId: 'pkg456',        // automatically preserved
 * //   folderKey: 'folder789',     // automatically preserved
 * //   folderName: 'My Folder',    // automatically preserved
 * //   packageVersions: ['1.0'],   // automatically preserved
 * //   versionCount: 2,            // automatically preserved
 * //   instanceCounts: { pending: 5, running: 10, completed: 15 }
 * // }
 * ```
 */
export function transformWithGrouping<TInput extends Record<string, any>, TOutput extends Record<string, any>>(
  data: TInput,
  groupConfig: {
    groupName: string;
    fields: Record<string, string>;
  }
): TOutput {
  const result: any = {};
  const groupedFieldNames = Object.keys(groupConfig.fields);
  const groupedValues: Record<string, any> = {};
  
  // Process all fields from the input data
  Object.entries(data).forEach(([key, value]) => {
    if (groupedFieldNames.includes(key)) {
      // This field should be grouped
      const targetFieldName = groupConfig.fields[key];
      groupedValues[targetFieldName] = value;
    } else {
      // This field should be preserved as-is
      result[key] = value;
    }
  });
  
  // Add the grouped fields
  result[groupConfig.groupName] = groupedValues;
  
  return result as TOutput;
} 