import { UserGetAllOptions, UserGetByIdOptions, UserGetCurrentOptions, UserGetResponse } from './users.types';
import { HasPaginationOptions, NonPaginatedResponse, PaginatedResponse } from '../../utils/pagination';

/**
 * Service for managing UiPath users from Orchestrator.
 *
 * User methods in this service call Orchestrator APIs and therefore require
 * corresponding OAuth scopes (for example OR.Users / OR.Users.Read).
 */
export interface UserServiceModel {
  /**
   * Gets users with optional OData filtering and pagination.
   *
   * @example
   * ```typescript
   * const result = await sdk.users.getAll({
   *   filter: "userName eq 'jane.doe'",
   *   pageSize: 10
   * });
   * console.log(result.items[0].emailAddress);
   * ```
   */
  getAll<T extends UserGetAllOptions = UserGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
    ? PaginatedResponse<UserGetResponse>
    : NonPaginatedResponse<UserGetResponse>
  >;

  /**
   * Gets a single user by ID.
   *
   * @example
   * ```typescript
   * const user = await sdk.users.getById(321, {
   *   select: 'id,userName,emailAddress'
   * });
   * console.log(user.userName);
   * ```
   */
  getById(id: number, options?: UserGetByIdOptions): Promise<UserGetResponse>;

  /**
   * Gets the currently authenticated user from Orchestrator.
   *
   * @example
   * ```typescript
   * const currentUser = await sdk.users.getCurrent({
   *   select: 'id,userName'
   * });
   * if (currentUser) {
   *   console.log(`Hello, ${currentUser.userName}`);
   * }
   * ```
   */
  getCurrent(options?: UserGetCurrentOptions): Promise<UserGetResponse | undefined>;
}
