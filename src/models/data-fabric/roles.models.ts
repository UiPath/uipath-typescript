import { DataFabricRole, DataFabricRoleGetAllOptions } from './roles.types';

/**
 * @internal
 */
export interface DataFabricRoleServiceModel {
  /**
   * Lists Data Fabric access roles.
   *
   * Returns tenant Data Fabric roles such as Admin, Designer, DataWriter, and
   * DataReader. Role IDs from this method can be passed to
   * `DataFabricDirectoryService.assignRoles()`.
   *
   * @param options - Optional query options
   * @returns Promise resolving to an array of {@link DataFabricRole}
   *
   * @example
   * ```typescript
   * import { DataFabricRoleService } from '@uipath/uipath-typescript/entities';
   *
   * const roles = new DataFabricRoleService(sdk);
   * const allRoles = await roles.getAll();
   * const dataWriter = allRoles.find(role => role.name === 'DataWriter');
   * ```
   *
   * @example
   * ```typescript
   * const rolesWithoutStats = await roles.getAll({ stats: false });
   * ```
   *
   * @internal
   */
  getAll(options?: DataFabricRoleGetAllOptions): Promise<DataFabricRole[]>;
}
