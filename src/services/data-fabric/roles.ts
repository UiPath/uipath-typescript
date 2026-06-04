import { track } from '../../core/telemetry';
import { DataFabricRoleServiceModel } from '../../models/data-fabric/roles.models';
import {
  DataFabricRole,
  DataFabricRoleGetAllOptions,
} from '../../models/data-fabric/roles.types';
import { RawDataFabricRoleListResponse } from '../../models/data-fabric/roles.internal-types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints/data-fabric';
import { createParams } from '../../utils/http/params';
import { BaseService } from '../base';

function extractRoles(data: RawDataFabricRoleListResponse | DataFabricRole[]): DataFabricRole[] {
  if (Array.isArray(data)) {
    return data;
  }
  return data.results ?? data.value ?? data.data ?? [];
}

/**
 * @internal
 */
export class DataFabricRoleService extends BaseService implements DataFabricRoleServiceModel {
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
  @track('DataFabricRoles.GetAll')
  async getAll(options: DataFabricRoleGetAllOptions = {}): Promise<DataFabricRole[]> {
    const params = createParams({
      stats: options.stats ?? true,
    });
    const response = await this.get<RawDataFabricRoleListResponse | DataFabricRole[]>(
      DATA_FABRIC_ENDPOINTS.ROLES.GET_ALL,
      { params }
    );
    return extractRoles(response.data);
  }
}
