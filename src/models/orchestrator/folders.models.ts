import type { FolderGetByKeyOptions, FolderGetResponse } from './folders.types';

/**
 * Service for looking up UiPath Orchestrator folders.
 *
 * Folders organize automations, queues, assets, and other resources, and scope
 * most Orchestrator API calls. [UiPath Folders Guide](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-folders)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Folders } from '@uipath/uipath-typescript/folders';
 *
 * const folders = new Folders(sdk);
 * const folder = await folders.getByKey('<folderKey>');
 * ```
 */
export interface FolderServiceModel {
  /**
   * Gets a single folder by its key (GUID).
   *
   * Queries the `odata/Folders` collection with `$filter=Key eq <key>` and
   * `$top=1`. Unlike most Orchestrator reads this lookup is not folder-scoped:
   * no folder headers are sent.
   *
   * @param key - Folder key (GUID).
   * @param options - Optional OData query options (`$select` / `$expand`).
   * @returns Promise resolving to the matching folder.
   * {@link FolderGetResponse}
   * @throws ValidationError when `key` is missing or not a GUID.
   * @throws NotFoundError when no folder matches `key`.
   * @example
   * ```typescript
   * // Resolve the fully qualified path for a known folder key
   * const folder = await folders.getByKey('<folderKey>', { select: 'FullyQualifiedName' });
   *
   * console.log(folder.fullyQualifiedName);
   * ```
   */
  getByKey(key: string, options?: FolderGetByKeyOptions): Promise<FolderGetResponse>;
}
