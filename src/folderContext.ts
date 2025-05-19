import { Config } from './config';
import { ExecutionContext } from './executionContext';
import { ENV } from './utils/constants';

/**
 * Constants for environment variables and headers
 */
export const ENV_FOLDER_KEY = 'UIPATH_FOLDER_KEY';
export const ENV_FOLDER_PATH = 'UIPATH_FOLDER_PATH';
export const HEADER_FOLDER_KEY = 'X-UIPATH-OrganizationUnitId';
export const HEADER_FOLDER_PATH = 'X-UIPATH-OrganizationUnitPath';

export interface FolderContextConfig {
  [ENV.FOLDER_KEY]?: string;
  [ENV.FOLDER_PATH]?: string;
}

/**
 * Manages the folder context for UiPath automation resources.
 * 
 * The FolderContext class handles information about the current folder in which
 * automation resources (like processes, assets, etc.) are being accessed or modified.
 * This is essential for organizing and managing resources in the UiPath Automation Cloud
 * folder structure.
 */
export class FolderContext {
  protected config: Config;
  protected executionContext: ExecutionContext;
  protected _folderKey: string | undefined;
  protected _folderPath: string | undefined;

  constructor(config: Config, executionContext: ExecutionContext, folderConfig: FolderContextConfig = {}) {
    this.config = config;
    this.executionContext = executionContext;
    this._folderKey = folderConfig[ENV.FOLDER_KEY];
    this._folderPath = folderConfig[ENV.FOLDER_PATH];
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
   *          set, returns an empty dictionary.
   */
  public get folderHeaders(): Record<string, string> {
    if (this._folderKey !== undefined) {
      return { [HEADER_FOLDER_KEY]: this._folderKey };
    } else if (this._folderPath !== undefined) {
      return { [HEADER_FOLDER_PATH]: this._folderPath };
    }
    return {};
  }

  public get folderKey(): string | undefined {
    return this._folderKey;
  }

  public get folderPath(): string | undefined {
    return this._folderPath;
  }

  set folderPath(value: string | undefined) {
    this._folderPath = value;
  }
}
