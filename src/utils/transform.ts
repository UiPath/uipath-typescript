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
  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => pascalToCamelCaseKeys(item));
  }

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const camelKey = pascalToCamelCase(key);
    
    // Recursively transform nested objects and arrays
    if (value !== null && typeof value === 'object') {
      result[camelKey] = pascalToCamelCaseKeys(value);
    } else {
      result[camelKey] = value;
    }
  }

  return result;
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
  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => camelToPascalCaseKeys(item));
  }

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const pascalKey = camelToPascalCase(key);
    
    // Recursively transform nested objects and arrays
    if (value !== null && typeof value === 'object') {
      result[pascalKey] = camelToPascalCaseKeys(value);
    } else {
      result[pascalKey] = value;
    }
  }

  return result;
} 