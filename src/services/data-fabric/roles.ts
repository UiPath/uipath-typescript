import { ServerError } from '../../core/errors';
import { track } from '../../core/telemetry';
import { DataFabricRoleServiceModel } from '../../models/data-fabric/roles.models';
import {
  DataFabricRole,
  DataFabricRoleGetAllOptions,
  DataFabricRoleType,
} from '../../models/data-fabric/roles.types';
import { FOLDER_KEY } from '../../utils/constants/headers';
import { DATA_FABRIC_ENDPOINTS } from '../../utils/constants/endpoints/data-fabric';
import { createHeaders } from '../../utils/http/headers';
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
    (type === DataFabricRoleType.System || type === DataFabricRoleType.UserDefined) &&
    hasValidDirectoryEntityCount &&
    hasValidFolderId;
}

function validateRolesResponse(data: unknown): DataFabricRole[] {
  if (Array.isArray(data) && data.every(isDataFabricRole)) {
    return data;
  }
  throw new ServerError({
    message: 'Invalid Data Fabric roles response format.',
  });
}

/**
 * @internal
 */
export class DataFabricRoleService extends BaseService implements DataFabricRoleServiceModel {
  @track('DataFabricRoles.GetAll')
  async getAll(options: DataFabricRoleGetAllOptions = {}): Promise<DataFabricRole[]> {
    const params = createParams({
      stats: options.stats ?? true,
    });
    const headers = createHeaders({ [FOLDER_KEY]: options.folderKey });
    const response = await this.get<DataFabricRole[]>(
      DATA_FABRIC_ENDPOINTS.ROLES.GET_ALL,
      { params, headers }
    );
    return validateRolesResponse(response.data);
  }
}
