import type {
  RawTaskCatalogGetResponse,
  TaskCatalogCreateOptions,
  TaskCatalogGetAllOptions,
  TaskCatalogGetByIdOptions,
  TaskCatalogGetByNameOptions,
  TaskCatalogUpdateOptions,
} from './task-catalogs.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * A task catalog as returned by the service.
 */
export interface TaskCatalogGetResponse extends RawTaskCatalogGetResponse {}

/**
 * Service for managing UiPath Action Center task catalogs.
 *
 * A task catalog is a reusable, folder-scoped definition that groups related tasks and configures how they behave: data retention (delete or archive the tasks after a retention period), encryption of task data, and tags. A task is linked to a catalog through its metadata (see `editMetadata`) to inherit that configuration. [UiPath Action Center Guide](https://docs.uipath.com/automation-cloud/docs/actions)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { TaskCatalogs } from '@uipath/uipath-typescript/tasks';
 *
 * const taskCatalogs = new TaskCatalogs(sdk);
 * const catalogs = await taskCatalogs.getAll({ folderId: <folderId> });
 * ```
 */
export interface TaskCatalogServiceModel {
  /**
   * Gets task catalogs in a folder.
   *
   * @param options - Folder scope (folderId, folderKey, or folderPath) plus query and pagination options
   * @returns Promise resolving to either a {@link NonPaginatedResponse} or {@link PaginatedResponse} of {@link TaskCatalogGetResponse} items, paginated when pagination options are used.
   * @example
   * ```typescript
   * const catalogs = await taskCatalogs.getAll({ folderId: <folderId> });
   *
   * // Paginated
   * const page1 = await taskCatalogs.getAll({ folderId: <folderId>, pageSize: 20 });
   * if (page1.hasNextPage) {
   *   const page2 = await taskCatalogs.getAll({ folderId: <folderId>, cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends TaskCatalogGetAllOptions = TaskCatalogGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<TaskCatalogGetResponse>
      : NonPaginatedResponse<TaskCatalogGetResponse>
  >;

  /**
   * Gets a task catalog by id.
   *
   * @param id - The task catalog id
   * @param options - Folder scope (folderId, folderKey, or folderPath) plus expand/select
   * @returns Promise resolving to the task catalog {@link TaskCatalogGetResponse}
   * @example
   * ```typescript
   * const catalog = await taskCatalogs.getById(<catalogId>, { folderId: <folderId> });
   * ```
   */
  getById(id: number, options?: TaskCatalogGetByIdOptions): Promise<TaskCatalogGetResponse>;

  /**
   * Gets a task catalog by name within a folder.
   *
   * @param name - The task catalog name
   * @param options - Folder scope (folderId, folderKey, or folderPath) plus expand/select
   * @returns Promise resolving to the matching task catalog {@link TaskCatalogGetResponse}
   * @example
   * ```typescript
   * const catalog = await taskCatalogs.getByName("Invoices", { folderId: <folderId> });
   * ```
   */
  getByName(name: string, options?: TaskCatalogGetByNameOptions): Promise<TaskCatalogGetResponse>;

  /**
   * Creates a task catalog.
   *
   * @param name - Name of the task catalog (max 50 characters)
   * @param options - Optional fields (description, tags, retention, ...) plus folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving to the created task catalog {@link TaskCatalogGetResponse}
   * @example
   * ```typescript
   * const catalog = await taskCatalogs.create("Invoices", { description: "Invoice tasks", folderId: <folderId> });
   * ```
   *
   * @example With retention
   * ```typescript
   * import { TaskCatalogRetentionAction } from '@uipath/uipath-typescript/tasks';
   * const catalog = await taskCatalogs.create("Invoices", {
   *   retentionAction: TaskCatalogRetentionAction.Delete,
   *   retentionPeriod: 30,
   *   folderId: <folderId>
   * });
   * ```
   */
  create(name: string, options?: TaskCatalogCreateOptions): Promise<TaskCatalogGetResponse>;

  /**
   * Updates a task catalog by id. Name, description and retention are preserved when not passed; tags are replaced only when provided (the catalog is not returned with its tags, so they cannot be auto preserved).
   *
   * @param id - The task catalog id
   * @param options - Fields to change (including an optional new name) plus folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving once the update completes
   * @example
   * ```typescript
   * // Change only the description, keep everything else
   * await taskCatalogs.updateById(<catalogId>, { description: "Updated", folderId: <folderId> });
   *
   * // Rename the catalog
   * await taskCatalogs.updateById(<catalogId>, { name: "Invoices 2025", folderId: <folderId> });
   * ```
   */
  updateById(id: number, options?: TaskCatalogUpdateOptions): Promise<void>;

  /**
   * Updates a task catalog by name, resolving the id internally. Name, description and retention are preserved when not passed; tags are replaced only when provided.
   *
   * @param name - The current name of the task catalog to update
   * @param options - Fields to change (including an optional new name) plus folder scope (folderId, folderKey, or folderPath)
   * @returns Promise resolving once the update completes
   * @example
   * ```typescript
   * // Change only the description
   * await taskCatalogs.updateByName("Invoices", { description: "Updated", folderId: <folderId> });
   *
   * // Rename the catalog
   * await taskCatalogs.updateByName("Invoices", { name: "Invoices 2025", folderId: <folderId> });
   * ```
   */
  updateByName(name: string, options?: TaskCatalogUpdateOptions): Promise<void>;
}
