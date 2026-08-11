import { BaseOptions, FolderScopedOptions, RequestOptions } from '../common/types';
import { PaginationOptions } from '../../utils/pagination';
import { Tag } from './tasks.types';

/**
 * Action taken on a task catalog's tasks when the retention period is reached.
 */
export enum TaskCatalogRetentionAction {
  /** Permanently delete the tasks. */
  Delete = 'Delete',
  /** Move the tasks to a storage bucket. */
  Archive = 'Archive',
  /** No retention is configured for the catalog. Returned by reads only. */
  None = 'None',
}

/**
 * Retention actions selectable when creating or updating a task catalog.
 */
export type TaskCatalogRetentionActionInput =
  | TaskCatalogRetentionAction.Delete
  | TaskCatalogRetentionAction.Archive;

/**
 * Raw task catalog shape returned by the API, before any method attachment.
 */
export interface RawTaskCatalogGetResponse {
  id: number;
  key: string;
  name: string;
  description: string | null;
  createdTime: string;
  lastModifiedTime: string | null;
  foldersCount: number | null;
  encrypted: boolean;
  tags: Tag[];
  retentionAction: TaskCatalogRetentionAction | null;
  retentionPeriod: number | null;
  retentionBucketId: number | null;
  retentionBucketName: string | null;
}

/**
 * Optional fields for creating a task catalog, plus folder scope.
 */
export interface TaskCatalogCreateOptions extends FolderScopedOptions {
  /** Description of the task catalog (max 512 characters). */
  description?: string;
  /** When true, tasks associated with this catalog have their Data encrypted. */
  encrypted?: boolean;
  /** Tags to associate with the task catalog. */
  tags?: Tag[];
  /** Action taken on the catalog's tasks when the retention period is reached. */
  retentionAction?: TaskCatalogRetentionActionInput;
  /** Retention period, in days. */
  retentionPeriod?: number;
  /** Id of the storage bucket used when retentionAction is Archive. */
  retentionBucketId?: number;
}

/**
 * Optional fields for updating a task catalog, plus folder scope. `encrypted` is omitted because the backend does not allow changing it after creation.
 */
export interface TaskCatalogUpdateOptions extends Omit<TaskCatalogCreateOptions, 'encrypted'> {
  /** New name for the catalog (max 50 characters). Defaults to the catalog's current name. */
  name?: string;
}

/**
 * Options for listing task catalogs: folder scope (folderId/folderKey/folderPath) + filtering/sorting + pagination.
 */
export type TaskCatalogGetAllOptions = RequestOptions & PaginationOptions & FolderScopedOptions;

/**
 * Options for getting a task catalog by id: folder scope + expand/select.
 */
export interface TaskCatalogGetByIdOptions extends BaseOptions, FolderScopedOptions {}

/**
 * Options for getting a task catalog by name: folder scope + expand/select.
 */
export interface TaskCatalogGetByNameOptions extends BaseOptions, FolderScopedOptions {}
