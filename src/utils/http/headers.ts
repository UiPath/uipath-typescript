import { FOLDER_ID, CONTENT_TYPES } from "../constants/headers";

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
 *   'Accept': CONTENT_TYPES.JSON
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
