/**
 * Platform users service model — the ServiceModel interface that drives generated
 * API documentation, plus the entity-method attachment factories.
 */

import type {
  RawPlatformUserGetResponse,
  PlatformUserGetAllOptions,
  PlatformUserUpdateOptions,
} from './users.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * A user account with entity methods attached.
 */
export type PlatformUserGetResponse = RawPlatformUserGetResponse & PlatformUserMethods;

/**
 * Public surface of the Users service.
 *
 * Users are organization-scoped accounts. Together with groups they form the basis of
 * access management: put users in groups, then grant roles to the groups.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Users } from '@uipath/uipath-typescript/users';
 *
 * const users = new Users(sdk);
 * const allUsers = await users.getAll();
 * ```
 */
export interface PlatformUserServiceModel {
  /**
   * Gets the users of the organization the SDK is configured for, with optional
   * search, sorting, and pagination.
   *
   * Returns each user's profile plus the groups they belong to (`groupIds`), so a
   * membership check against a known group needs no extra call.
   *
   * @param options - Search, sorting, and pagination options
   * @returns All users when no pagination options are given, one page otherwise, as {@link PlatformUserGetResponse} items
   *
   * @example Basic usage
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Users } from '@uipath/uipath-typescript/users';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const users = new Users(sdk);
   * const allUsers = await users.getAll();
   * for (const user of allUsers.items) {
   *   console.log(`${user.email}: member of ${user.groupIds.length} groups`);
   * }
   * ```
   *
   * @example Search and paginate
   * ```typescript
   * import { PlatformUserSortField, PlatformUserSortOrder } from '@uipath/uipath-typescript/users';
   *
   * const page1 = await users.getAll({
   *   searchTerm: 'sarah',
   *   sortBy: PlatformUserSortField.Email,
   *   sortOrder: PlatformUserSortOrder.Ascending,
   *   pageSize: 20,
   * });
   * if (page1.hasNextPage) {
   *   const page2 = await users.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   */
  getAll<T extends PlatformUserGetAllOptions = PlatformUserGetAllOptions>(
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
   * // Get a user id from the listing first
   * const { items } = await users.getAll();
   *
   * const user = await users.getById(items[0].id);
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
   * Resolves once the change is applied. Input Identity rejects (for example an email
   * that is already taken) surfaces as a `ValidationError` carrying the reason.
   *
   * @param userId - GUID of the user to update
   * @param update - The fields to change
   * @returns Promise that resolves when the update has been applied
   *
   * @example Add a user to a group
   * ```typescript
   * // Get a user id from the listing first
   * const { items } = await users.getAll();
   *
   * await users.updateById(items[0].id, {
   *   groupIdsToAdd: ['<groupId>'],
   * });
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
  updateById(userId: string, update: PlatformUserUpdateOptions): Promise<void>;
}

/**
 * Methods attached to user objects returned by the Users service.
 */
export interface PlatformUserMethods {
  /**
   * Updates this user. Only the fields present in `update` are changed.
   *
   * @param update - The fields to change
   * @returns Promise that resolves when the update has been applied
   */
  update(update: PlatformUserUpdateOptions): Promise<void>;
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
    async update(update: PlatformUserUpdateOptions): Promise<void> {
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
