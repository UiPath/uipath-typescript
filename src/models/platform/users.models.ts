/**
 * Platform users service model — the ServiceModel interface that drives generated
 * API documentation, plus the entity-method attachment factories.
 */

import type {
  RawPlatformUserGetResponse,
  PlatformUserGetAllOptions,
  PlatformUserUpdateOptions,
  PlatformUserUpdateResponse,
} from './users.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * A user account with entity methods attached.
 */
export type PlatformUserGetResponse = RawPlatformUserGetResponse & PlatformUserMethods;

/**
 * Public surface of the platform Users service.
 *
 * Users are organization-scoped accounts. Together with groups they form the basis of
 * access management: put users in groups, then grant roles to the groups.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Users } from '@uipath/uipath-typescript/platform';
 *
 * const users = new Users(sdk);
 * const allUsers = await users.getAll('<organizationId>');
 * ```
 */
export interface PlatformUserServiceModel {
  /**
   * Gets the users of an organization, with optional search, sorting, and pagination.
   *
   * Returns each user's profile plus the groups they belong to (`groupIds`), so a
   * membership check against a known group needs no extra call.
   *
   * @param organizationId - Organization (account) GUID to list users from
   * @param options - Search, sorting, and pagination options
   * @returns All users when no pagination options are given, one page otherwise, as {@link PlatformUserGetResponse} items
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Users } from '@uipath/uipath-typescript/platform';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const users = new Users(sdk);
   * const allUsers = await users.getAll('<organizationId>');
   * for (const user of allUsers.items) {
   *   console.log(`${user.email}: member of ${user.groupIds.length} groups`);
   * }
   * ```
   *
   * @example Search and paginate
   * ```typescript
   * import { PlatformUserSortField, PlatformUserSortOrder } from '@uipath/uipath-typescript/platform';
   *
   * const page1 = await users.getAll('<organizationId>', {
   *   searchTerm: 'sarah',
   *   sortBy: PlatformUserSortField.Email,
   *   sortOrder: PlatformUserSortOrder.Ascending,
   *   pageSize: 20,
   * });
   * if (page1.hasNextPage) {
   *   const page2 = await users.getAll('<organizationId>', { cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends PlatformUserGetAllOptions = PlatformUserGetAllOptions>(
    organizationId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformUserGetResponse>
      : NonPaginatedResponse<PlatformUserGetResponse>
  >;

  /**
   * Gets a user by ID.
   *
   * Returns the user's profile, activity timestamps, and group memberships
   * (`groupIds`).
   *
   * @param userId - GUID of the user
   * @returns The user, as a {@link PlatformUserGetResponse}
   *
   * @example
   * ```typescript
   * const user = await users.getById('<userId>');
   * console.log(`${user.userName} last signed in at ${user.lastLoginTime}`);
   * ```
   */
  getById(userId: string): Promise<PlatformUserGetResponse>;

  /**
   * Updates a user.
   *
   * Only the fields present in `update` are changed — omitted fields keep their
   * current values. Group membership is edited incrementally through
   * `groupIdsToAdd` / `groupIdsToRemove`, which makes this the call for granting or
   * revoking a user's access ("add user to the Administrators group").
   *
   * Group IDs can be read from any user's `groupIds` (e.g. via `users.getById()`).
   *
   * @param userId - GUID of the user to update
   * @param update - The fields to change
   * @returns The update result, as a {@link PlatformUserUpdateResponse}
   *
   * @example Add a user to a group
   * ```typescript
   * const result = await users.updateById('<userId>', {
   *   groupIdsToAdd: ['<groupId>'],
   * });
   * if (!result.success) {
   *   console.error(result.errors);
   * }
   * ```
   *
   * @example Update profile fields
   * ```typescript
   * await users.updateById('<userId>', {
   *   displayName: 'Sarah C.',
   *   isActive: true,
   * });
   * ```
   */
  updateById(userId: string, update: PlatformUserUpdateOptions): Promise<PlatformUserUpdateResponse>;
}

/**
 * Methods attached to user objects returned by the Users service.
 */
export interface PlatformUserMethods {
  /**
   * Updates this user. Only the fields present in `update` are changed.
   *
   * @param update - The fields to change
   * @returns Promise resolving to the update result
   */
  update(update: PlatformUserUpdateOptions): Promise<PlatformUserUpdateResponse>;
}

/**
 * Creates the bound methods for a user object.
 *
 * @param userData - The user data (response from API)
 * @param service - The Users service instance
 * @returns Object containing user methods
 */
function createPlatformUserMethods(
  userData: RawPlatformUserGetResponse,
  service: PlatformUserServiceModel
): PlatformUserMethods {
  return {
    async update(update: PlatformUserUpdateOptions): Promise<PlatformUserUpdateResponse> {
      if (!userData.id) throw new Error('User ID is undefined');

      return service.updateById(userData.id, update);
    },
  };
}

/**
 * Attaches entity methods to a user object.
 *
 * @param userData - The user data (response from API)
 * @param service - The Users service instance
 * @returns The user with bound methods
 */
export function createPlatformUserWithMethods(
  userData: RawPlatformUserGetResponse,
  service: PlatformUserServiceModel
): PlatformUserGetResponse {
  const methods = createPlatformUserMethods(userData, service);
  return Object.assign({}, userData, methods);
}
