/**
 * @internal
 */
export type DataFabricRoleType = 'System' | 'UserDefined';

/**
 * @internal
 */
export interface DataFabricRole {
  id: string;
  name: string;
  type: DataFabricRoleType;
  directoryEntityCount?: number | null;
  folderId?: string;
}

/**
 * @internal
 */
export interface DataFabricRoleGetAllOptions {
  /**
   * Include role statistics in the response.
   *
   * Defaults to true to match the Data Fabric UI and CLI role-list flow.
   */
  stats?: boolean;
}
