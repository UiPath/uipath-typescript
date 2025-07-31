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

// /**
//  * Creates a transform function with predefined field mappings
//  * @param fieldMapping Object mapping source field names to target field names
//  * @returns Function that transforms data using the provided field mapping
//  * 
//  * @example
//  * ```typescript
//  * // Create a reusable transform function
//  * const transformUser = createTransform({
//  *   id: 'userId',
//  *   userName: 'name'
//  * });
//  * 
//  * // Use the transform function
//  * const user = transformUser({ id: '123', userName: 'john' });
//  * // user = { userId: '123', name: 'john' }
//  * 
//  * // Transform an array of users
//  * const users = transformUser([
//  *   { id: '123', userName: 'john' },
//  *   { id: '456', userName: 'jane' }
//  * ]);
//  * ```
//  */
// export function createTransform<T extends object>(fieldMapping: FieldMapping) {
//   return (data: T | T[]): T => transformData(data, fieldMapping);
// }

/**
 * Converts a string from PascalCase to camelCase
 * @param str The PascalCase string to convert
 * @returns The camelCase version of the string
 * 
 * @example
 * ```typescript
 * pascalToCamelCase('HelloWorld'); // 'helloWorld'
 * pascalToCamelCase('TaskAssignmentCriteria'); // 'taskAssignmentCriteria'
 * ```
 */
export function pascalToCamelCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Converts a string from camelCase to PascalCase
 * @param str The camelCase string to convert
 * @returns The PascalCase version of the string
 * 
 * @example
 * ```typescript
 * camelToPascalCase('helloWorld'); // 'HelloWorld'
 * camelToPascalCase('taskAssignmentCriteria'); // 'TaskAssignmentCriteria'
 * ```
 */
export function camelToPascalCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generic function to transform object keys using a provided case conversion function
 * @param data The object to transform
 * @param convertCase The function to convert each key
 * @returns A new object with transformed keys
 */
function _transformCaseKeys<T extends object>(
  data: T | T[], 
  convertCase: (str: string) => string
): any {
  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => _transformCaseKeys(item, convertCase));
  }

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const transformedKey = convertCase(key);
    
    // Recursively transform nested objects and arrays
    if (value !== null && typeof value === 'object') {
      result[transformedKey] = _transformCaseKeys(value, convertCase);
    } else {
      result[transformedKey] = value;
    }
  }

  return result;
}

/**
 * Transforms an object's keys from PascalCase to camelCase
 * @param data The object with PascalCase keys
 * @returns A new object with all keys converted to camelCase
 * 
 * @example
 * ```typescript
 * // Simple object
 * pascalToCamelCaseKeys({ Id: "123", TaskName: "Invoice" });
 * // Result: { id: "123", taskName: "Invoice" }
 * 
 * // Nested object
 * pascalToCamelCaseKeys({ 
 *   TaskId: "456",
 *   TaskDetails: { AssignedUser: "John", Priority: "High" }
 * });
 * // Result: { 
 * //   taskId: "456",
 * //   taskDetails: { assignedUser: "John", priority: "High" } 
 * // }
 * 
 * // Array of objects
 * pascalToCamelCaseKeys([
 *   { Id: "1", IsComplete: false },
 *   { Id: "2", IsComplete: true }
 * ]);
 * // Result: [
 * //   { id: "1", isComplete: false },
 * //   { id: "2", isComplete: true }
 * // ]
 * ```
 */
export function pascalToCamelCaseKeys<T extends object>(data: T | T[]): any {
  return _transformCaseKeys(data, pascalToCamelCase);
}

/**
 * Transforms an object's keys from camelCase to PascalCase
 * @param data The object with camelCase keys
 * @returns A new object with all keys converted to PascalCase
 * 
 * @example
 * ```typescript
 * // Simple object
 * camelToPascalCaseKeys({ userId: "789", isActive: true });
 * // Result: { UserId: "789", IsActive: true }
 * 
 * // Nested object
 * camelToPascalCaseKeys({ 
 *   taskId: "ABC123",
 *   submissionData: { customerName: "XYZ Corp" }
 * });
 * // Result: { 
 * //   TaskId: "ABC123",
 * //   SubmissionData: { CustomerName: "XYZ Corp" } 
 * // }
 * 
 * // Array of objects
 * camelToPascalCaseKeys([
 *   { userId: "u1", roleType: "admin" },
 *   { userId: "u2", roleType: "user" }
 * ]);
 * // Result: [
 * //   { UserId: "u1", RoleType: "admin" },
 * //   { UserId: "u2", RoleType: "user" }
 * // ]
 * ```
 */
export function camelToPascalCaseKeys<T extends object>(data: T | T[]): any {
  return _transformCaseKeys(data, camelToPascalCase);
} 

/**
 * Maps a field value in an object using a provided mapping object.
 * Returns a new object with the mapped field value.
 * 
 * @param obj The object to map
 * @param field The field name to map
 * @param valueMap The mapping object (from input value to output value)
 * @returns A new object with the mapped field value
 * 
 * @example
 * const statusMap = { 0: 'Unassigned', 1: 'Pending', 2: 'Completed' };
 * const task = { status: 1, id: 123 };
 * const mapped = mapFieldValue(task, 'status', statusMap);
 * // mapped = { status: 'Pending', id: 123 }
 */
export function _mapFieldValue<
  T extends object,
  K extends keyof T,
  M extends { [key: string]: any }
>(
  obj: T,
  field: K,
  valueMap: M
): T {
  const lookupKey = String(obj[field]);
  return {
    ...obj,
    [field]:
      lookupKey in valueMap
        ? valueMap[lookupKey as keyof M]
        : obj[field],
  };
} 

/**
 * General API response transformer with optional field value mapping.
 *
 * @param data - The API response data to transform
 * @param options - Optional mapping options:
 *   - field: The field name to map (optional)
 *   - valueMap: The mapping object for the field (optional)
 *   - transform: A function to further transform the data (optional)
 * @returns The transformed data, with field value mapped if specified
 *
 * @example
 * // Just transform
 * const result = applyDataTransforms(data);
 *
 * // Map a field value, then transform
 * const result = applyDataTransforms(data, { field: 'status', valueMap: StatusMap });
 *
 * // Map a field value, then apply a custom transform
 * const result = applyDataTransforms(data, { field: 'status', valueMap: StatusMap, transform: customTransform });
 */
export function applyDataTransforms<T extends object, K extends keyof T, M extends { [key: string]: any }>(
  data: T,
  options?: {
    field?: K;
    valueMap?: M;
    transform?: (d: T) => T;
  }
): T {
  let result = data;
  if (options?.field && options?.valueMap) {
    result = _mapFieldValue(result, options.field, options.valueMap);
  }
  if (options?.transform) {
    result = options.transform(result);
  }
  return result;
} 

/**
 * Adds a prefix to specified keys in an object, returning a new object.
 * Only the provided keys are prefixed; all others are left unchanged.
 *
 * @param obj The source object
 * @param prefix The prefix to add (e.g., '$')
 * @param keys The keys to prefix (e.g., ['expand', 'filter'])
 * @returns A new object with specified keys prefixed
 *
 * @example
 * addPrefixToKeys({ expand: 'a', foo: 1 }, '$', ['expand']) // { $expand: 'a', foo: 1 }
 */
export function addPrefixToKeys<T extends object>(
  obj: T,
  prefix: string,
  keys: string[]
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (keys.includes(key)) {
      result[`${prefix}${key}`] = value;
    } else {
      result[key] = value;
    }
  }
  return result;
} 