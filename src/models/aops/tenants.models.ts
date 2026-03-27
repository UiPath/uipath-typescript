import { Tenant, TenantGetAllOptions, TenantPolicyAssignment, TenantPolicyUpdateOptions } from './tenants.types';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';

/**
 * Response type for getting a single tenant
 */
export type TenantGetResponse = Tenant;

/**
 * Response type for getting all tenants (paginated)
 */
export interface TenantPagedResponse {
  /** Array of tenants */
  result: Tenant[];
  /** Total number of tenants */
  totalCount: number;
}

/**
 * Request body for getting all tenants (PUT request)
 */
export interface TenantGetAllRequest {
  /** Page index (0-based) */
  pageIndex: number;
  /** Number of items per page */
  pageSize: number;
  /** Search term to filter tenants */
  searchTerm: string;
}

/**
 * Service model interface for Tenant operations
 */
export interface TenantServiceModel {
  /**
   * Gets all tenants with optional pagination
   */
  getAll<T extends TenantGetAllOptions = TenantGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Tenant>
      : NonPaginatedResponse<Tenant>
  >;

  /**
   * Gets a tenant by its identifier
   */
  getById(tenantId: string): Promise<TenantGetResponse>;

  /**
   * Updates tenant policies
   */
  updatePolicies(options: TenantPolicyUpdateOptions): Promise<void>;
}
