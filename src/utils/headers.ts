import { HEADERS } from './constants';

/**
 * Constants for header keys
 */
export const HEADER_FOLDER_KEY = 'X-UIPATH-FolderKey';
export const HEADER_FOLDER_PATH = 'X-UIPATH-FolderPath';

/**
 * Creates folder headers for API requests.
 * Only one of folderKey or folderPath can be provided.
 * 
 * @param folderKey - The folder key
 * @param folderPath - The folder path
 * @returns Record of header key-value pairs
 * @throws Error if both folderKey and folderPath are provided
 */
export function headerFolder(
  folderKey?: string,
  folderPath?: string
): Record<string, string> {
  if (folderKey && folderPath) {
    throw new Error('Only one of folderKey or folderPath can be provided');
  }

  const headers: Record<string, string> = {};
  
  if (folderKey) {
    headers[HEADERS.FOLDER_KEY] = folderKey;
  }
  if (folderPath) {
    headers[HEADERS.FOLDER_PATH] = folderPath;
  }

  return headers;
} 