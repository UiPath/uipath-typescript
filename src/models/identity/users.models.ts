/**
 * Identity Users service model — public response shapes and the ServiceModel
 * interface that drives generated API documentation.
 */

import type {
  RawUserGetResponse,
  UserCreateData,
  UserCreateOptions,
  UserOperationResult,
  UserUpdateOptions,
  UserUpdateResponse,
} from './users.types';

/**
 * User with attached methods
 */
export type UserGetResponse = RawUserGetResponse & UserMethods;

/**
 * Response from `create()`.
 *
 * `result` reflects the request as a whole; `users` contains the created users.
 */
export interface UserCreateResponse {
  /** Overall outcome of the create request. */
  result: UserOperationResult;
  /** The created users. */
  users: UserGetResponse[];
}

/**
 * Service model for managing users in a UiPath organization.
 *
 * Provides organization-level user administration: retrieving, updating and
 * deleting users, creating users in bulk, and inviting users by email.
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Users } from '@uipath/uipath-typescript/users';
 *
 * const users = new Users(sdk);
 * const user = await users.getById('<userId>');
 * ```
 */
export interface UserServiceModel {
  /**
   * Gets a user by ID.
   *
   * Returns the full user details including profile fields, group membership,
   * activity flags and invitation state, with entity methods attached
   * (`update`, `delete`).
   *
   * @param userId - User GUID
   * @returns Promise resolving to a {@link UserGetResponse} with the user's profile fields, group membership, activity flags and invitation state, plus bound entity methods
   *
   * @example
   * ```typescript
   * const user = await users.getById('<userId>');
   * console.log(`${user.displayName} (${user.email}) — active: ${user.isActive}`);
   *
   * // Operate on the user directly via bound methods
   * await user.update({ displayName: 'New Name' });
   * ```
   */
  getById(userId: string): Promise<UserGetResponse>;

  /**
   * Updates a user. Only the provided fields are changed.
   *
   * @param userId - User GUID
   * @param options - Fields to update
   * @returns Promise resolving to a {@link UserUpdateResponse} indicating whether the update succeeded and any errors
   *
   * @example
   * ```typescript
   * // First, get the user with users.getById() or from users.create()
   * const result = await users.updateById('<userId>', { displayName: 'New Name' });
   * if (result.succeeded) {
   *   console.log('User updated');
   * }
   * ```
   *
   * @example Manage group membership
   * ```typescript
   * await users.updateById('<userId>', {
   *   groupIdsToAdd: ['<groupId-1>'],
   *   groupIdsToRemove: ['<groupId-2>'],
   * });
   * ```
   */
  updateById(userId: string, options: UserUpdateOptions): Promise<UserUpdateResponse>;

  /**
   * Deletes a user.
   *
   * @param userId - User GUID
   * @returns Promise that resolves when the user is deleted
   *
   * @example
   * ```typescript
   * await users.deleteById('<userId>');
   * ```
   */
  deleteById(userId: string): Promise<void>;

  /**
   * Creates users in bulk.
   *
   * Returns the created users with entity methods attached (`update`, `delete`).
   * A single invalid user fails the whole request — check `result.errors` for
   * the reason.
   *
   * @param users - Users to create
   * @param organizationId - Organization GUID the users belong to
   * @param options - Optional group assignment applied to every created user
   * @returns Promise resolving to a {@link UserCreateResponse} with the overall outcome and the created users
   *
   * @example
   * ```typescript
   * const response = await users.create(
   *   [{ userName: 'jdoe', email: 'jdoe@acme.com', name: 'Jane', surname: 'Doe' }],
   *   '<organizationId>'
   * );
   * if (response.result.succeeded) {
   *   console.log(`Created ${response.users[0].id}`);
   * }
   * ```
   *
   * @example Add every created user to groups
   * ```typescript
   * const response = await users.create(
   *   [{ userName: 'jdoe', email: 'jdoe@acme.com' }],
   *   '<organizationId>',
   *   { groupIds: ['<groupId>'] }
   * );
   * ```
   */
  create(
    users: UserCreateData[],
    organizationId: string,
    options?: UserCreateOptions
  ): Promise<UserCreateResponse>;
}

/**
 * Methods attached to user objects returned by `getById()` and `create()`.
 */
export interface UserMethods {
  /**
   * Updates this user. Only the provided fields are changed.
   *
   * @param options - Fields to update
   * @returns Promise resolving to the operation outcome
   */
  update(options: UserUpdateOptions): Promise<UserUpdateResponse>;

  /**
   * Deletes this user.
   *
   * @returns Promise that resolves when the user is deleted
   */
  delete(): Promise<void>;
}

/**
 * Creates methods for a user
 *
 * @param userData - The user data (response from API)
 * @param service - The user service instance
 * @returns Object containing user methods
 */
function createUserMethods(userData: RawUserGetResponse, service: UserServiceModel): UserMethods {
  return {
    async update(options: UserUpdateOptions): Promise<UserUpdateResponse> {
      if (!userData.id) throw new Error('User ID is undefined');
      return service.updateById(userData.id, options);
    },

    async delete(): Promise<void> {
      if (!userData.id) throw new Error('User ID is undefined');
      return service.deleteById(userData.id);
    },
  };
}

/**
 * Attaches methods to a user object
 *
 * @param userData - The user data (response from API)
 * @param service - The user service instance
 * @returns User data with methods attached
 */
export function createUserWithMethods(
  userData: RawUserGetResponse,
  service: UserServiceModel
): UserGetResponse {
  const methods = createUserMethods(userData, service);
  return Object.assign({}, userData, methods);
}
