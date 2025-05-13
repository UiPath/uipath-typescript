/**
 * Constants for header keys
 */
export declare const HEADER_FOLDER_KEY = "X-UIPATH-FolderKey";
export declare const HEADER_FOLDER_PATH = "X-UIPATH-FolderPath";
/**
 * Creates folder headers for API requests.
 * Only one of folderKey or folderPath can be provided.
 *
 * @param folderKey - The folder key
 * @param folderPath - The folder path
 * @returns Record of header key-value pairs
 * @throws Error if both folderKey and folderPath are provided
 */
export declare function headerFolder(folderKey?: string, folderPath?: string): Record<string, string>;
