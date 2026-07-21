/**
 * Identity Users service model — public response shapes and the ServiceModel
 * interface that drives generated API documentation.
 */

import type { RawUserGetResponse } from './users.types';

/**
 * User returned by the Users service.
 */
export interface UserGetResponse extends RawUserGetResponse {}

/**
 * Service model for managing users in a UiPath organization.
 *
 * Provides organization-level user administration.
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
   * activity flags and invitation state.
   *
   * @param userId - User GUID
   * @returns Promise resolving to the user
   * {@link UserGetResponse}
   *
   * @example
   * ```typescript
   * const user = await users.getById('<userId>');
   * console.log(`${user.displayName} (${user.email}) — active: ${user.isActive}`);
   * ```
   */
  getById(userId: string): Promise<UserGetResponse>;
}
