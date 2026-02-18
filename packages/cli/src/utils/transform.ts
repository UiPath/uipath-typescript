/**
 * Converts a string from PascalCase to camelCase
 * @param str The PascalCase string to convert
 * @returns The camelCase version of the string
 */
export function pascalToCamelCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Generic function to transform object keys using a provided case conversion function
 * @param data The object to transform
 * @param convertCase The function to convert each key
 * @returns A new object with transformed keys
 */
function transformCaseKeys<T extends object>(
  data: T | T[], 
  convertCase: (str: string) => string
): any {
  // Handle array of objects
  if (Array.isArray(data)) {
    return data.map(item => {
      // If the array element is a primitive (string, number, etc.), return it as is
      if (item === null || typeof item !== 'object' || typeof item === 'string') {
        return item;
      }
      // Only recursively transform if it's actually an object
      return transformCaseKeys(item, convertCase);
    });
  }

  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const transformedKey = convertCase(key);
    
    // Recursively transform nested objects and arrays
    if (value !== null && typeof value === 'object') {
      result[transformedKey] = transformCaseKeys(value, convertCase);
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
 * ```
 */
export function pascalToCamelCaseKeys<T extends object>(data: T | T[]): any {
  return transformCaseKeys(data, pascalToCamelCase);
}