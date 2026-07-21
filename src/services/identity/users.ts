/**
 * UserService — organization-level user administration via the Identity API.
 */

import { track } from '../../core/telemetry';
import { BaseService } from '../base';

import type {
  RawUserGetResponse,
  UserCreateData,
  UserCreateOptions,
  UserInviteData,
  UserInviteResponse,
  UserInviteResult,
  UserUpdateOptions,
  UserUpdateResponse,
} from '../../models/identity/users.types';
import {
  createUserWithMethods,
  type UserCreateResponse,
  type UserGetResponse,
  type UserServiceModel,
} from '../../models/identity/users.models';
import {
  INTERNAL_USER_FIELDS,
  type RawUserCreateResponse,
  type RawUserEntry,
  type RawUserInviteResponse,
} from '../../models/identity/users.internal-types';
import {
  UserCategoryMap,
  UserInviteResultMap,
  UserMap,
  UserTypeMap,
} from '../../models/identity/users.constants';

import { IDENTITY_USER_ENDPOINTS } from '../../utils/constants/endpoints';
import { applyDataTransforms, transformData, transformRequest } from '../../utils/transform';

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
    return createUserWithMethods(this.transformUser(response.data), this);
  }

  @track('Users.UpdateById')
  async updateById(userId: string, options: UserUpdateOptions): Promise<UserUpdateResponse> {
    const response = await this.put<UserUpdateResponse>(
      IDENTITY_USER_ENDPOINTS.BY_ID(userId),
      transformRequest(options, UserMap)
    );
    return response.data;
  }

  @track('Users.DeleteById')
  async deleteById(userId: string): Promise<void> {
    await this.delete<void>(IDENTITY_USER_ENDPOINTS.BY_ID(userId));
  }

  @track('Users.Create')
  async create(
    users: UserCreateData[],
    organizationId: string,
    options?: UserCreateOptions
  ): Promise<UserCreateResponse> {
    const response = await this.post<RawUserCreateResponse>(IDENTITY_USER_ENDPOINTS.BULK_CREATE, {
      users,
      partitionGlobalId: organizationId,
      groupIDs: options?.groupIds,
    });
    return {
      result: response.data.result,
      users: response.data.users.map((user) =>
        createUserWithMethods(this.transformUser(user), this)
      ),
    };
  }

  @track('Users.Invite')
  async invite(users: UserInviteData[]): Promise<UserInviteResponse> {
    const response = await this.post<RawUserInviteResponse>(
      IDENTITY_USER_ENDPOINTS.INVITE,
      users.map((user) => transformRequest(user, UserMap))
    );
    return {
      result: response.data.result,
      users: transformData(response.data.users, UserInviteResultMap) as unknown as UserInviteResult[],
    };
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
