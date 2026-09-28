import type { BaseOptions } from '../common/types';
import type { PaginationOptions } from '../../utils/pagination/types';

/**
 * Orchestrator folder type.
 */
export enum FolderType {
  Standard = 'Standard',
  Personal = 'Personal',
  Virtual = 'Virtual',
  Solution = 'Solution',
  DebugSolution = 'DebugSolution',
}

/**
 * Robot provisioning model for a folder.
 */
export enum FolderProvisionType {
  Manual = 'Manual',
  Automatic = 'Automatic',
}

/**
 * Permission model for a folder.
 */
export enum FolderPermissionModel {
  InheritFromTenant = 'InheritFromTenant',
  FineGrained = 'FineGrained',
}

/**
 * Package feed used by a folder.
 */
export enum FolderFeedType {
  Undefined = 'Undefined',
  Processes = 'Processes',
  Libraries = 'Libraries',
  PersonalWorkspace = 'PersonalWorkspace',
  FolderHierarchy = 'FolderHierarchy',
}

/**
 * A single Orchestrator folder returned by {@link FolderServiceModel.getByKey}.
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
  /** Description of the folder. */
  description: string | null;
  /** Folder type (standard, personal workspace, solution, …). */
  folderType: FolderType;
  /** Robot provisioning type. */
  provisionType: FolderProvisionType | null;
  /** Folder permission model. */
  permissionModel: FolderPermissionModel | null;
  /** Numeric id of the parent folder, or `null` for a root folder. */
  parentId: number | null;
  /** Key (GUID) of the parent folder, or `null` for a root folder. */
  parentKey: string | null;
  /** Package feed type for the folder. */
  feedType: FolderFeedType;
}

/**
 * Query options for {@link FolderServiceModel.getByKey} (`expand` / `select` only).
 * This lookup is not folder-scoped — no folder headers are sent.
 */
export interface FolderGetByKeyOptions extends BaseOptions {}

/**
 * Where a folder sits in the tenant's folder tree.
 */
export enum FolderRootType {
  /** A classic, tenant-level folder. */
  Classic = 0,
  /** A personal workspace. */
  Personal = 1,
  /** A modern, hierarchy-enabled folder. */
  Modern = 2,
}

/**
 * A folder returned by {@link FolderServiceModel.getAll}.
 *
 * Everything {@link FolderGetResponse} carries, plus the three fields the
 * folder list returns and the single-folder lookup does not.
 */
export type FolderGetAllResponse = FolderGetResponse & {
  /** Dot-separated chain of ancestor keys, ending in this folder's own key. */
  folderPath: string;
  /** Where the folder sits in the tenant's folder tree. */
  rootType: FolderRootType;
  /** Whether the folder is a personal workspace. */
  isPersonal: boolean;
};

/**
 * Query options for {@link FolderServiceModel.getAll}.
 *
 * Pagination only — the folder list is not an OData route, so it accepts no
 * `filter`, `orderby`, `select` or `expand`.
 */
export type FolderGetAllOptions = PaginationOptions;
