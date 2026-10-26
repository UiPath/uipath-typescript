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
   * Each folder carries its id, key, display name, fully qualified path,
   * folder type and parent reference.
   *
   * Without pagination options, a single page is returned at the server's
   * default page size. Compare `totalCount` with `items.length`, or page with
   * `pageSize` and `cursor`, to retrieve every folder.
   *
   * @param options - Optional pagination options.
   * @returns Promise resolving to a {@link NonPaginatedResponse} of {@link FolderGetAllResponse} without pagination options, or a {@link PaginatedResponse} of {@link FolderGetAllResponse} when pagination options are used.
   * @example
   * ```typescript
   * // Get folders (first page at the server's default page size)
   * const result = await folders.getAll();
   * result.items.forEach(folder => console.log(folder.fullyQualifiedName));
   * ```
   *
   * @example
   * ```typescript
   * // Page through every folder
   * let page = await folders.getAll({ pageSize: 100 });
   * const allFolders = [...page.items];
   * while (page.hasNextPage && page.nextCursor) {
   *   page = await folders.getAll({ cursor: page.nextCursor });
   *   allFolders.push(...page.items);
   * }
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
