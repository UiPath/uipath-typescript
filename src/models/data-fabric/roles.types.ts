/**
 * @internal
 */
export interface DataFabricRole {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  isSystem?: boolean;
  [key: string]: unknown;
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
