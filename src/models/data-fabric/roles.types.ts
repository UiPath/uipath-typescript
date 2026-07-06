/**
 * @internal
 */
export enum DataFabricRoleType {
  System = 'System',
  UserDefined = 'UserDefined',
}

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

  /**
   * Optional folder key for folder-aware Role V2 requests.
   *
   * Forwarded on the wire as the `X-UIPATH-FolderKey` header.
   */
  folderKey?: string;
}
