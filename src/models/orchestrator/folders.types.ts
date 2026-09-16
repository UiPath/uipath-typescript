import type { BaseOptions } from '../common/types';

/**
 * A single Orchestrator folder, camelCased from the OData wire format.
 */
export interface FolderGetResponse {
  /** Numeric folder id. */
  id: number;
  /** Folder key (GUID). */
  key: string;
  /** Display name of the folder. */
  displayName: string;
  /** Fully qualified folder path (e.g. `Shared/Finance`). */
  fullyQualifiedName: string;
}

/**
 * Query options for `getByKey` (`$expand` / `$select` only — the Folders
 * collection itself is not folder-scoped, so no folder headers are sent).
 */
export interface FolderGetByKeyOptions extends BaseOptions {}
