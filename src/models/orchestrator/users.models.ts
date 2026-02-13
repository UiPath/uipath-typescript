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
   */
  getAll<T extends UserGetAllOptions = UserGetAllOptions>(options?: T): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<UserGetResponse>
      : NonPaginatedResponse<UserGetResponse>
  >;

  /**
   * Gets a single user by ID.
   */
  getById(id: number, options?: UserGetByIdOptions): Promise<UserGetResponse>;

  /**
   * Gets the currently authenticated user from Orchestrator.
   */
  getCurrent(options?: UserGetCurrentOptions): Promise<UserGetResponse | undefined>;
}
