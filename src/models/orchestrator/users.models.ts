import type { OrchestratorUserGetAllOptions, OrchestratorUserGetResponse } from './users.types';
import type { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination';

/**
 * Service for listing the users of a UiPath Orchestrator tenant.
 *
 * Orchestrator users are the accounts — people, groups, robots and external
 * applications — that can sign in to a tenant and hold roles in it.
 * [Managing user access](https://docs.uipath.com/orchestrator/automation-cloud/latest/user-guide/about-managing-user-access)
 *
 * ### Usage
 *
 * Prerequisites: Initialize the SDK first - see [Getting Started](/uipath-typescript/getting-started/#import-initialize)
 *
 * ```typescript
 * import { OrchestratorUsers } from '@uipath/uipath-typescript/orchestrator-users';
 *
 * const orchestratorUsers = new OrchestratorUsers(sdk);
 * const allUsers = await orchestratorUsers.getAll();
 * ```
 */
export interface OrchestratorUserServiceModel {
  /**
   * Gets the users of the tenant with optional filtering, sorting, projection and pagination.
   *
   * This is a tenant-level read — no folder context is involved. Each user carries its
   * type (person, directory group, robot, …), role names, license type, and the
   * activity and session flags that govern what the account may do. Robot-provisioning
   * configuration and credential fields are intentionally not exposed. Add
   * `expand: 'userRoles'` to include each user's role assignments.
   *
   * @param options - Query options (`filter`, `orderby`, `select`, `expand`) and pagination options. OData expressions use the SDK field names, for example `createdTime`.
   * @returns Promise resolving to a `NonPaginatedResponse` of {@link OrchestratorUserGetResponse} items, or to a `PaginatedResponse` of {@link OrchestratorUserGetResponse} items when pagination options are used.
   * @example
   * ```typescript
   * // All users in the tenant
   * const users = await orchestratorUsers.getAll();
   * ```
   *
   * @example
   * ```typescript
   * // Active directory users, newest first, one page at a time
   * const page1 = await orchestratorUsers.getAll({
   *   filter: "isActive eq true and type eq 'DirectoryUser'",
   *   orderby: 'createdTime desc',
   *   pageSize: 50
   * });
   *
   * if (page1.hasNextPage) {
   *   const page2 = await orchestratorUsers.getAll({ cursor: page1.nextCursor });
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Look up a user by sign-in name (usually the email address)
   * const { items } = await orchestratorUsers.getAll({
   *   filter: "userName eq 'jane.doe@example.com'"
   * });
   * const user = items[0];
   * console.log(user.id, user.rolesList);
   * ```
   *
   * @example
   * ```typescript
   * // Include role assignments and trim the payload to the fields you need
   * const { items } = await orchestratorUsers.getAll({
   *   expand: 'userRoles',
   *   select: 'id,userName,userRoles'
   * });
   * ```
   */
  getAll<T extends OrchestratorUserGetAllOptions = OrchestratorUserGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<OrchestratorUserGetResponse>
      : NonPaginatedResponse<OrchestratorUserGetResponse>
  >;
}
