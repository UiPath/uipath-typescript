/**
 * UserService — organization-level user administration via the Identity API.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type { RawUserGetResponse } from '../../models/identity/users.types';
import type { UserGetResponse, UserServiceModel } from '../../models/identity/users.models';
import {
  INTERNAL_USER_FIELDS,
  type RawUserEntry,
} from '../../models/identity/users.internal-types';
import { UserCategoryMap, UserMap, UserTypeMap } from '../../models/identity/users.constants';

import { IDENTITY_USER_ENDPOINTS } from '../../utils/constants/endpoints';
import { applyDataTransforms, transformData } from '../../utils/transform';

/**
 * Service for managing users in a UiPath organization.
 *
 * All operations route at the **organization** level — no tenant or folder
 * context is involved.
 */
export class UserService extends BaseService implements UserServiceModel {
  @track('Users.GetById')
  async getById(userId: string): Promise<UserGetResponse> {
    const response = await this.get<RawUserEntry>(IDENTITY_USER_ENDPOINTS.BY_ID(userId));
    return this.transformUser(response.data);
  }

  /**
   * Strips internal fields from a raw user entry and applies the SDK field
   * renames and numeric → enum value mappings before returning it to the consumer.
   */
  private transformUser(user: RawUserEntry): RawUserGetResponse {
    const stripped: RawUserEntry = { ...user };
    for (const field of INTERNAL_USER_FIELDS) {
      delete stripped[field];
    }
    const renamed = transformData(stripped, UserMap) as unknown as RawUserGetResponse;
    return applyDataTransforms(renamed, {
      field: 'type',
      valueMap: UserTypeMap,
      transform: (data) =>
        applyDataTransforms(data, { field: 'category', valueMap: UserCategoryMap }),
    });
  }
}
