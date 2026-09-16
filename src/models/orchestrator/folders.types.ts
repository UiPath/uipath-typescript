import type { BaseOptions } from '../common/types';

/**
 * Orchestrator folder type.
 *
 * Serialized as a string by the Folders OData API.
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
 *
 * Serialized as a string by the Folders OData API.
 */
export enum FolderProvisionType {
  Manual = 'Manual',
  Automatic = 'Automatic',
}

/**
 * Permission model for a folder.
 *
 * Serialized as a string by the Folders OData API.
 */
export enum FolderPermissionModel {
  InheritFromTenant = 'InheritFromTenant',
  FineGrained = 'FineGrained',
}

/**
 * Package feed used by a folder.
 *
 * Serialized as a string by the Folders OData API.
 */
export enum FolderFeedType {
  Undefined = 'Undefined',
  Processes = 'Processes',
  Libraries = 'Libraries',
  PersonalWorkspace = 'PersonalWorkspace',
  FolderHierarchy = 'FolderHierarchy',
}

/**
 * A single Orchestrator folder, camelCased from the OData wire format.
 *
 * Matches the serialized `FolderDto` fields (JsonIgnore / SwaggerIgnore
 * properties are omitted).
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
  /** True when {@link FolderGetResponse.folderType} is `Personal`. */
  isPersonal: boolean;
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
 * Query options for `getByKey` (`$expand` / `$select` only — the Folders
 * GetByKey action is not folder-scoped, so no folder headers are sent).
 */
export interface FolderGetByKeyOptions extends BaseOptions {}
