"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FolderContext = exports.HEADER_FOLDER_PATH = exports.HEADER_FOLDER_KEY = exports.ENV_FOLDER_PATH = exports.ENV_FOLDER_KEY = void 0;
/**
 * Constants for environment variables and headers
 */
exports.ENV_FOLDER_KEY = 'UIPATH_FOLDER_KEY';
exports.ENV_FOLDER_PATH = 'UIPATH_FOLDER_PATH';
exports.HEADER_FOLDER_KEY = 'X-UIPATH-OrganizationUnitId';
exports.HEADER_FOLDER_PATH = 'X-UIPATH-OrganizationUnitPath';
/**
 * Manages the folder context for UiPath automation resources.
 *
 * The FolderContext class handles information about the current folder in which
 * automation resources (like processes, assets, etc.) are being accessed or modified.
 * This is essential for organizing and managing resources in the UiPath Automation Cloud
 * folder structure.
 */
class FolderContext {
    constructor(config, executionContext) {
        this.config = config;
        this.executionContext = executionContext;
        this._folderKey = process.env[exports.ENV_FOLDER_KEY];
        this._folderPath = process.env[exports.ENV_FOLDER_PATH];
    }
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
    get folderHeaders() {
        if (this._folderKey !== undefined) {
            return { [exports.HEADER_FOLDER_KEY]: this._folderKey };
        }
        else if (this._folderPath !== undefined) {
            return { [exports.HEADER_FOLDER_PATH]: this._folderPath };
        }
        return {};
    }
    get folderKey() {
        return this._folderKey;
    }
    get folderPath() {
        return this._folderPath;
    }
    set folderPath(value) {
        this._folderPath = value;
    }
}
exports.FolderContext = FolderContext;
