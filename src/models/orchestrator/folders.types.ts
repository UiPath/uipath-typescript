import type { BaseOptions } from '../common/types';

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
