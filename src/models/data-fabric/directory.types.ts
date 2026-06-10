/**
 * @internal
 */
export enum DataFabricDirectoryEntityType {
  /** Identity user, robot user, or directory robot principal. */
  User = 0,
  /** Identity group principal. */
  Group = 1,
  /** External application principal. */
  Application = 2,
}

/**
 * @internal
 */
export enum DataFabricDirectoryEntityTypeName {
  User = 'User',
  Group = 'Group',
  Application = 'Application',
}

/**
 * @internal
 */
export type DataFabricDirectoryEntityTypeInput =
  | DataFabricDirectoryEntityType
  | DataFabricDirectoryEntityTypeName;

/**
 * @internal
 */
export interface DataFabricDirectoryRole {
  id: string;
  name: string;
}

/**
 * @internal
 */
export interface DataFabricDirectoryEntry {
  externalId: string;
  name: string;
  email?: string | null;
  type: DataFabricDirectoryEntityTypeName;
  roles: DataFabricDirectoryRole[];
  objectType?: string | null;
  isUIEnabled: boolean;
}

/**
 * @internal
 */
export interface DataFabricDirectoryListOptions {
  skip?: number;
  top?: number;
}

/**
 * @internal
 */
export interface DataFabricDirectoryGetAllOptions {
  pageSize?: number;
}

/**
 * @internal
 */
export interface DataFabricDirectoryListResponse {
  totalCount: number;
  results: DataFabricDirectoryEntry[];
}

/**
 * @internal
 */
export interface DataFabricDirectoryAssignOptions {
  /**
   * Preserve the principal's current Data Fabric roles.
   *
   * Defaults to true because the Data Fabric role assignment endpoint replaces
   * the role set for each principal.
   */
  preserveExisting?: boolean;
  /**
   * Enables Data Fabric UI access for the assigned principal.
   *
   * Defaults to true.
   */
  uiEnabled?: boolean;
}

/**
 * @internal
 */
export interface DataFabricDirectoryAssignmentResult {
  principalId: string;
  roleIds: string[];
}
