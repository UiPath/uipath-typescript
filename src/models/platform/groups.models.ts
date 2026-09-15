/**
 * Platform groups service model — the ServiceModel interface that drives generated
 * API documentation, plus the entity-method attachment factories.
 */

import type {
  RawPlatformGroupGetResponse,
  PlatformGroupCreateOptions,
  PlatformGroupMembershipOptions,
  PlatformGroupUpdateOptions,
  PlatformGroupMember,
} from './groups.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions, PaginationOptions } from '../../utils/pagination';

/**
 * A group with entity methods attached.
 */
export type PlatformGroupGetResponse = RawPlatformGroupGetResponse & PlatformGroupMethods;

/**
 * Public surface of the Groups service.
 *
 * Groups are organization-scoped containers of users. Together with users they form
 * the basis of access management: put users in groups, then grant roles to the groups.
 * Membership can be edited from the group side (this service) or from the user side
 * (`users.updateById()` with `groupIdsToAdd` / `groupIdsToRemove`).
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { Groups } from '@uipath/uipath-typescript/platform';
 *
 * const groups = new Groups(sdk);
 * const allGroups = await groups.getAll();
 * ```
 */
export interface PlatformGroupServiceModel {
  /**
   * Gets all local and built-in groups of the organization the SDK is configured for.
   *
   * Returns every group with its type (built-in or custom) and timestamps. Built-in
   * groups (Everyone, Administrators, …) cannot be modified or deleted.
   *
   * @returns All groups, as {@link PlatformGroupGetResponse} items
   *
   * @example
   * ```typescript
   * import { UiPath } from '@uipath/uipath-typescript/core';
   * import { Groups } from '@uipath/uipath-typescript/platform';
   *
   * const sdk = new UiPath(config);
   * await sdk.initialize();
   *
   * const groups = new Groups(sdk);
   * const allGroups = await groups.getAll();
   * const admins = allGroups.find(g => g.name === 'Administrators');
   * ```
   */
  getAll(): Promise<PlatformGroupGetResponse[]>;

  /**
   * Gets a group by ID.
   *
   * @param groupId - GUID of the group
   * @returns The group, as a {@link PlatformGroupGetResponse}
   *
   * @example
   * ```typescript
   * // Get a group id from the listing first
   * const allGroups = await groups.getAll();
   *
   * const group = await groups.getById(allGroups[0].id);
   * ```
   */
  getById(groupId: string): Promise<PlatformGroupGetResponse>;

  /**
   * Creates a local group.
   *
   * Members can be added at creation through `memberUserIds`, or later — from the
   * group side with `updateById()`, or from the user side with `users.updateById()`.
   *
   * @param name - Name of the new group
   * @param options - Initial members
   * @returns The created group, as a {@link PlatformGroupGetResponse}
   *
   * @example Create an empty group
   * ```typescript
   * const group = await groups.create('Ticket Admins');
   * ```
   *
   * @example Create with initial members
   * ```typescript
   * const group = await groups.create('Ticket Admins', {
   *   memberUserIds: ['<userId>'],
   * });
   * ```
   */
  create(name: string, options?: PlatformGroupCreateOptions): Promise<PlatformGroupGetResponse>;

  /**
   * Updates a local group.
   *
   * The group's name must be sent on every update — pass the current name when
   * only editing membership (the bound `group.update()` fills it in automatically).
   * Membership is edited incrementally through `memberUserIdsToAdd` /
   * `memberUserIdsToRemove`. Built-in groups cannot be updated.
   *
   * @param groupId - GUID of the group to update
   * @param name - The group's name (new name to rename, or current name to keep it)
   * @param options - Membership changes
   * @returns The group as stored after the update, as a {@link PlatformGroupGetResponse}
   *
   * @example Rename a group
   * ```typescript
   * const updated = await groups.updateById('<groupId>', 'Ticket Managers');
   * ```
   *
   * @example Edit membership (keeping the current name)
   * ```typescript
   * const group = await groups.getById('<groupId>');
   * await groups.updateById(group.id, group.name, {
   *   memberUserIdsToAdd: ['<userId>'],
   *   memberUserIdsToRemove: ['<otherUserId>'],
   * });
   * ```
   */
  updateById(
    groupId: string,
    name: string,
    options?: PlatformGroupMembershipOptions
  ): Promise<PlatformGroupGetResponse>;

  /**
   * Deletes a local group. Built-in groups cannot be deleted.
   *
   * @param groupId - GUID of the group to delete
   * @returns Resolves when the group has been deleted
   *
   * @example
   * ```typescript
   * await groups.deleteById('<groupId>');
   * ```
   */
  deleteById(groupId: string): Promise<void>;

  /**
   * Gets the local members of a group, with optional pagination.
   *
   * Returns member references (`id` and account type). Fetch full profiles with
   * `users.getById()` when needed. Note: membership of implicit groups (e.g.
   * Everyone) is not materialized — they report no local members.
   *
   * @param groupId - GUID of the group
   * @param options - Pagination options
   * @returns All members when no pagination options are given, one page otherwise, as {@link PlatformGroupMember} items
   *
   * @example Basic usage
   * ```typescript
   * const members = await groups.getMembers('<groupId>');
   * ```
   *
   * @example Paginated
   * ```typescript
   * const page1 = await groups.getMembers('<groupId>', { pageSize: 50 });
   * if (page1.hasNextPage) {
   *   const page2 = await groups.getMembers('<groupId>', { cursor: page1.nextCursor });
   * }
   * ```
   */
  getMembers<T extends PaginationOptions = PaginationOptions>(
    groupId: string,
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformGroupMember>
      : NonPaginatedResponse<PlatformGroupMember>
  >;
}

/**
 * Methods attached to group objects returned by the Groups service.
 */
export interface PlatformGroupMethods {
  /**
   * Updates this group. The current name is filled in automatically when
   * `update.name` is omitted (the API requires a name on every update).
   *
   * @param update - The fields to change
   * @returns Promise resolving to the group as stored after the update
   */
  update(update: PlatformGroupUpdateOptions): Promise<PlatformGroupGetResponse>;

  /**
   * Deletes this group.
   *
   * @returns Promise resolving when the group has been deleted
   */
  delete(): Promise<void>;

  /**
   * Gets the local members of this group.
   *
   * @param options - Pagination options
   * @returns Promise resolving to the group's members
   */
  getMembers<T extends PaginationOptions = PaginationOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<PlatformGroupMember>
      : NonPaginatedResponse<PlatformGroupMember>
  >;
}

/**
 * Creates the bound methods for a group object.
 *
 * @param groupData - The group data (response from API)
 * @param service - The Groups service instance
 * @returns Object containing group methods
 */
function createPlatformGroupMethods(
  groupData: RawPlatformGroupGetResponse,
  service: PlatformGroupServiceModel
): PlatformGroupMethods {
  return {
    async update(update: PlatformGroupUpdateOptions): Promise<PlatformGroupGetResponse> {
      if (!groupData.id) throw new Error('Group ID is undefined');

      const { name, ...membership } = update;
      return service.updateById(groupData.id, name ?? groupData.name, membership);
    },

    async delete(): Promise<void> {
      if (!groupData.id) throw new Error('Group ID is undefined');

      return service.deleteById(groupData.id);
    },

    async getMembers<T extends PaginationOptions = PaginationOptions>(
      options?: T
    ): Promise<
      T extends HasPaginationOptions<T>
        ? PaginatedResponse<PlatformGroupMember>
        : NonPaginatedResponse<PlatformGroupMember>
    > {
      if (!groupData.id) throw new Error('Group ID is undefined');

      return service.getMembers(groupData.id, options);
    },
  };
}

/**
 * Attaches entity methods to a group object.
 *
 * @param groupData - The group data (response from API)
 * @param service - The Groups service instance
 * @returns The group with bound methods
 */
export function createPlatformGroupWithMethods(
  groupData: RawPlatformGroupGetResponse,
  service: PlatformGroupServiceModel
): PlatformGroupGetResponse {
  const methods = createPlatformGroupMethods(groupData, service);
  return Object.assign({}, groupData, methods);
}
