import {
  DataFabricDirectoryAssignOptions,
  DataFabricDirectoryAssignmentResult,
  DataFabricDirectoryEntityTypeInput,
  DataFabricDirectoryEntry,
  DataFabricDirectoryGetAllOptions,
  DataFabricDirectoryListOptions,
  DataFabricDirectoryListResponse,
} from './directory.types';

/**
 * @internal
 */
export interface DataFabricDirectoryServiceModel {
  /**
   * Lists one page of Data Fabric directory principals and their current roles.
   *
   * Returns directory entries with external IDs, principal metadata, and
   * assigned Data Fabric roles.
   *
   * @param options - Optional offset paging options
   * @returns Promise resolving to {@link DataFabricDirectoryListResponse}
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService } from '@uipath/uipath-typescript/entities';
   *
   * const directory = new DataFabricDirectoryService(sdk);
   * const page = await directory.list({ skip: 0, top: 50 });
   * const firstPrincipal = page.results[0];
   * ```
   *
   * @internal
   */
  list(options?: DataFabricDirectoryListOptions): Promise<DataFabricDirectoryListResponse>;

  /**
   * Lists all Data Fabric directory principals and their current roles.
   *
   * Follows the Data Fabric directory top/skip pagination and returns
   * normalized entries. Entries without assigned roles include an empty
   * `roles` array.
   *
   * @param options - Optional page-size options
   * @returns Promise resolving to an array of {@link DataFabricDirectoryEntry}
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService } from '@uipath/uipath-typescript/entities';
   *
   * const directory = new DataFabricDirectoryService(sdk);
   * const principals = await directory.getAll({ pageSize: 100 });
   * ```
   *
   * @internal
   */
  getAll(options?: DataFabricDirectoryGetAllOptions): Promise<DataFabricDirectoryEntry[]>;

  /**
   * Assigns Data Fabric roles to one or more principals.
   *
   * The Data Fabric API replaces the role set for each principal, so this
   * method preserves existing roles by default and posts the union of current
   * and requested role IDs.
   *
   * Role IDs can be discovered with `DataFabricRoleService.getAll()`. Set
   * `preserveExisting: false` only when intentionally replacing a principal's
   * Data Fabric role set.
   *
   * @param principalIds - Principal external ID or IDs
   * @param principalType - Principal type
   * @param roleIds - Data Fabric role IDs to assign
   * @param options - Optional assignment behavior
   * @returns Promise resolving to an array of {@link DataFabricDirectoryAssignmentResult}
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService, DataFabricRoleService } from '@uipath/uipath-typescript/entities';
   *
   * const roles = new DataFabricRoleService(sdk);
   * const directory = new DataFabricDirectoryService(sdk);
   *
   * const dataWriter = (await roles.getAll()).find(role => role.name === 'DataWriter');
   * if (!dataWriter) {
   *   throw new Error('DataWriter role not found');
   * }
   *
   * await directory.assignRoles('<identity-group-id>', 'Group', [dataWriter.id]);
   * ```
   *
   * @example
   * ```typescript
   * await directory.assignRoles('<identity-user-id>', 'User', ['<role-id>'], {
   *   preserveExisting: false,
   * });
   * ```
   *
   * @internal
   */
  assignRoles(
    principalIds: string | string[],
    principalType: DataFabricDirectoryEntityTypeInput,
    roleIds: string[],
    options?: DataFabricDirectoryAssignOptions
  ): Promise<DataFabricDirectoryAssignmentResult[]>;

  /**
   * Revokes all direct Data Fabric roles from one or more principals.
   *
   * The Data Fabric API removes all role assignments for each supplied external
   * ID. Use this when a principal should no longer have direct Data Fabric
   * access. Inherited access through groups is not changed.
   *
   * @param principalIds - Principal external ID or IDs
   * @returns Promise resolving when the roles are revoked
   *
   * @example
   * ```typescript
   * import { DataFabricDirectoryService } from '@uipath/uipath-typescript/entities';
   *
   * const directory = new DataFabricDirectoryService(sdk);
   *
   * await directory.revokeRoles('<identity-user-id>');
   * ```
   *
   * @example
   * ```typescript
   * await directory.revokeRoles([
   *   '<identity-user-id>',
   *   '<identity-group-id>',
   * ]);
   * ```
   *
   * @internal
   */
  revokeRoles(principalIds: string | string[]): Promise<void>;
}
