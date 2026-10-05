import type {
  FolderGetAllOptions,
  FolderGetAllResponse,
  FolderGetByKeyOptions,
  FolderGetResponse,
} from './folders.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '@/utils/pagination';

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
   * Gets the folders the calling user has access to, across the tenant.
   *
   * Returns only folders the user can actually operate in, so the result is
   * safe to offer as a picker. Each folder carries its id, key, fully
   * qualified path and parent reference.
   *
   * @param options - Optional pagination options.
   * @returns Promise resolving to a {@link NonPaginatedResponse} of {@link FolderGetAllResponse} without pagination options, or a {@link PaginatedResponse} of {@link FolderGetAllResponse} when pagination options are used.
   * @example
   * ```typescript
   * // Get all folders
   * const allFolders = await folders.getAll();
   * allFolders.items.forEach(folder => console.log(folder.fullyQualifiedName));
   * ```
   *
   * @example
   * ```typescript
   * // With pagination
   * const page = await folders.getAll({ pageSize: 10 });
   * console.log(page.totalCount, page.hasNextPage);
   * ```
   */
  getAll<T extends FolderGetAllOptions = FolderGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<FolderGetAllResponse>
      : NonPaginatedResponse<FolderGetAllResponse>
  >;

  /**
   * Gets a single folder by its key (GUID). Unlike most Orchestrator reads,
   * this lookup is not folder-scoped: no folder headers are sent.
   *
   * @param key - Folder key (GUID).
   * @param options - Optional query options (`select`).
   * @returns Promise resolving to the matching {@link FolderGetResponse}. Rejects with `ValidationError` when `key` is missing or not a GUID, and with `NotFoundError` when no folder matches the key.
   * @example
   * ```typescript
   * // Get a folder by key
   * const folder = await folders.getByKey('<folderKey>');
   * ```
   *
   * @example
   * ```typescript
   * // With select
   * const folder = await folders.getByKey('<folderKey>', { select: 'fullyQualifiedName' });
   * console.log(folder.fullyQualifiedName);
   * ```
   */
  getByKey(key: string, options?: FolderGetByKeyOptions): Promise<FolderGetResponse>;
}
