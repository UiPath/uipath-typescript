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
  return (response: { [key: string]: T[] }): T[] => {
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
export function mapArrayItems<T, R>(itemTransform: (item: T) => R) {
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
    mapArrayItems(itemTransform)
  ]);
} 