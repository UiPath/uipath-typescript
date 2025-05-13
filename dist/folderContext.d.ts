import { Config } from './config';
import { ExecutionContext } from './executionContext';
/**
 * Constants for environment variables and headers
 */
export declare const ENV_FOLDER_KEY = "UIPATH_FOLDER_KEY";
export declare const ENV_FOLDER_PATH = "UIPATH_FOLDER_PATH";
export declare const HEADER_FOLDER_KEY = "X-UIPATH-OrganizationUnitId";
export declare const HEADER_FOLDER_PATH = "X-UIPATH-OrganizationUnitPath";
/**
 * Manages the folder context for UiPath automation resources.
 *
 * The FolderContext class handles information about the current folder in which
 * automation resources (like processes, assets, etc.) are being accessed or modified.
 * This is essential for organizing and managing resources in the UiPath Automation Cloud
 * folder structure.
 */
export declare class FolderContext {
    protected config: Config;
    protected executionContext: ExecutionContext;
    protected _folderKey: string | undefined;
    protected _folderPath: string | undefined;
    constructor(config: Config, executionContext: ExecutionContext);
    /**
     * Get the HTTP headers for folder-based API requests.
     *
     * Returns headers containing either the folder key or folder path,
     * which are used to specify the target folder for API operations.
     * The folder context is essential for operations that need to be
     * performed within a specific folder in UiPath Automation Cloud.
     *
     * @returns A dictionary containing the appropriate folder header
     *          (either folder key or folder path). If no folder header is
     *          set as environment variable, returns an empty dictionary.
     */
    get folderHeaders(): Record<string, string>;
    get folderKey(): string | undefined;
    get folderPath(): string | undefined;
    set folderPath(value: string | undefined);
}
