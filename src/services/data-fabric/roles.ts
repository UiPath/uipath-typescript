import { ValidationError } from '../../core/errors';
import { track } from '../../core/telemetry';
import { DataFabricRoleServiceModel } from '../../models/data-fabric/roles.models';
import {
  DataFabricRole,
  DataFabricRoleGetAllOptions,
} from '../../models/data-fabric/roles.types';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints/data-fabric';
import { createParams } from '../../utils/http/params';
import { BaseService } from '../base';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDataFabricRole(value: unknown): value is DataFabricRole {
  if (!isRecord(value)) {
    return false;
  }
  const { id, name, type, directoryEntityCount, folderId } = value;
  const hasValidDirectoryEntityCount = directoryEntityCount === undefined ||
    directoryEntityCount === null ||
    typeof directoryEntityCount === 'number';
  const hasValidFolderId = folderId === undefined || typeof folderId === 'string';
  return typeof id === 'string' &&
    typeof name === 'string' &&
    (type === 'System' || type === 'UserDefined') &&
    hasValidDirectoryEntityCount &&
    hasValidFolderId;
}

function validateRolesResponse(data: unknown): DataFabricRole[] {
  if (Array.isArray(data) && data.every(isDataFabricRole)) {
    return data;
  }
  throw new ValidationError({
    message: 'Invalid Data Fabric roles response format.',
  });
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
    const response = await this.get<DataFabricRole[]>(
      DATA_FABRIC_ENDPOINTS.ROLES.GET_ALL,
      { params }
    );
    return validateRolesResponse(response.data);
  }
}
