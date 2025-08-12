import { FOLDER_ID } from "../constants/headers";

/**
 * Creates headers object from key-value pairs
 * @param headersObj - Object containing header key-value pairs
 * @returns Headers object with all values converted to strings
 * 
 * @example
 * ```typescript
 * // Single header
 * const headers = createHeaders({ 'X-UIPATH-FolderKey': '1234567890' });
 * 
 * // Multiple headers
 * const headers = createHeaders({
 *   'X-UIPATH-FolderKey': '1234567890',
 *   'X-UIPATH-OrganizationUnitId': 123,
 *   'Accept': 'application/json'
 * });
 * 
 * // Using constants
 * import { FOLDER_KEY, FOLDER_ID } from '../constants/headers';
 * const headers = createHeaders({
 *   [FOLDER_KEY]: 'abc-123',
 *   [FOLDER_ID]: 456
 * });
 * 
 * // Empty headers
 * const headers = createHeaders();
 * ```
 */
export function createHeaders(headersObj: Record<string, string | number | undefined>): Record<string, string> {
  const headers: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headersObj)) {
    if (value !== undefined && value !== null) {
      headers[key] = value.toString();
    }
  }
  
  return headers;
}

/**
 * Legacy support - creates headers with folder ID
 * @deprecated Use createHeaders({ [FOLDER_ID]: folderId }) instead
 * @param folderId - Folder/organization unit ID
 * @returns Headers object with folder ID
 */
export function createHeadersLegacy(folderId?: number): Record<string, string> {
  if (folderId === undefined) {
    return {};
  }
  
  return createHeaders({ [FOLDER_ID]: folderId });
}

/**
 * Creates query parameters object from key-value pairs
 * @param paramsObj - Object containing parameter key-value pairs
 * @returns Parameters object with all values converted to strings, excluding undefined values
 * 
 * @example
 * ```typescript
 * // Single parameter
 * const params = createParams({ 'api-version': '1.1' });
 * 
 * // Multiple parameters
 * const params = createParams({
 *   'api-version': '1.1',
 *   'page': 1,
 *   'pageSize': 100,
 *   'filter': undefined  // Will be excluded
 * });
 * 
 * // Conditional parameters
 * const params = createParams({
 *   'api-version': '1.1',
 *   'includeDeleted': options.includeDeleted,  // Only included if defined
 *   'orderBy': options.orderBy  // Only included if defined
 * });
 * ```
 */
export function createParams(paramsObj: Record<string, string | number | boolean | undefined>): Record<string, string> {
  const params: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(paramsObj)) {
    if (value !== undefined) {
      params[key] = value.toString();
    }
  }
  
  return params;
}
