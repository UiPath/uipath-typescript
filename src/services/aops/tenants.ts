import { BaseService } from '../base';
import {
  Tenant,
  TenantGetAllOptions,
  TenantPolicyAssignment,
  TenantPolicyUpdateOptions,
} from '../../models/aops/tenants.types';
import {
  TenantServiceModel,
  TenantGetResponse,
  TenantPagedResponse,
  TenantGetAllRequest,
} from '../../models/aops/tenants.models';
import {
  TENANT_PAGINATION,
  TENANT_PAGINATION_PARAMS,
} from '../../models/aops/tenants.constants';
import { TENANT_ENDPOINTS } from '../../utils/constants/endpoints/aops';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath Tenant API
 *
 * Provides methods for managing tenants and tenant policy assignments
 * in the UiPath Autonomous Operations (AoPS) platform.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Tenants } from '@uipath/uipath-typescript/tenants';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const tenants = new Tenants(sdk);
 *
 * // Get all tenants
 * const allTenants = await tenants.getAll();
 *
 * // Get a specific tenant
 * const tenant = await tenants.getById('tenant-id');
 * ```
 */
export class TenantService extends BaseService implements TenantServiceModel {
  /**
   * Gets all tenants with optional pagination
   *
   * Note: This API uses PUT method with a request body for pagination.
   *
   * @param options - Pagination and search options (pageSize, searchTerm)
   * @returns Promise resolving to array of tenants or paginated response
   *
   * @example
   * ```typescript
   * import { Tenants } from '@uipath/uipath-typescript/tenants';
   *
   * const tenants = new Tenants(sdk);
   *
   * // Get all tenants (non-paginated, default page size 100)
   * const allTenants = await tenants.getAll();
   *
   * // Get first page with custom page size
   * const page1 = await tenants.getAll({ pageSize: 10 });
   *
   * // Search for tenants
   * const filtered = await tenants.getAll({ searchTerm: 'production' });
   * ```
   */
  @track('Tenants.GetAll')
  async getAll<T extends TenantGetAllOptions = TenantGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Tenant>
      : NonPaginatedResponse<Tenant>
  > {
    const opts = options as TenantGetAllOptions | undefined;
    const pageSize = opts?.pageSize ?? TENANT_PAGINATION.DEFAULT_PAGE_SIZE;
    const searchTerm = opts?.searchTerm ?? '';

    // Build the request body for the PUT request
    const requestBody: TenantGetAllRequest = {
      pageIndex: 0,
      pageSize: pageSize,
      searchTerm: searchTerm,
    };

    // Handle pagination if jumpToPage is specified
    if (opts?.jumpToPage && opts.jumpToPage > 1) {
      requestBody.pageIndex = opts.jumpToPage - 1;
    }

    const response = await this.put<TenantPagedResponse>(
      TENANT_ENDPOINTS.GET_ALL,
      requestBody
    );

    // If pagination options are provided, return paginated response
    if (opts?.pageSize || opts?.jumpToPage) {
      const totalCount = response.data.totalCount;
      const currentPage = requestBody.pageIndex + 1;
      const hasMore = (currentPage * pageSize) < totalCount;

      return {
        data: response.data.result,
        hasNextPage: hasMore,
        hasPreviousPage: currentPage > 1,
        nextCursor: hasMore ? String(currentPage + 1) : undefined,
        previousCursor: currentPage > 1 ? String(currentPage - 1) : undefined,
        totalCount: totalCount,
      } as any;
    }

    // Non-paginated response
    return {
      data: response.data.result,
    } as any;
  }

  /**
   * Gets a tenant by its identifier
   *
   * @param tenantId - The unique identifier of the tenant
   * @returns Promise resolving to the tenant with its policy assignments
   *
   * @example
   * ```typescript
   * const tenant = await tenants.getById('my-tenant-id');
   * console.log(tenant.name, tenant.tenantPolicies);
   * ```
   */
  @track('Tenants.GetById')
  async getById(tenantId: string): Promise<TenantGetResponse> {
    const response = await this.get<TenantGetResponse>(
      TENANT_ENDPOINTS.GET_BY_ID(tenantId)
    );
    return response.data;
  }

  /**
   * Updates tenant policies
   *
   * @param options - Tenant policy update options containing the policies array
   * @returns Promise resolving when the update is complete
   *
   * @example
   * ```typescript
   * // Get current tenant policies
   * const tenant = await tenants.getById('my-tenant-id');
   *
   * // Update AITrustLayer policy
   * const updatedPolicies = tenant.tenantPolicies.map(policy => {
   *   if (policy.productIdentifier === 'AITrustLayer') {
   *     return { ...policy, policyIdentifier: 'new-policy-id' };
   *   }
   *   return policy;
   * });
   *
   * // Save the updated policies
   * await tenants.updatePolicies({ policies: updatedPolicies });
   * ```
   */
  @track('Tenants.UpdatePolicies')
  async updatePolicies(options: TenantPolicyUpdateOptions): Promise<void> {
    // Remove tenantName from the payload as it's not needed for the POST request
    const payload = options.policies.map(({ tenantName, ...policy }) => policy);

    await this.post<void>(TENANT_ENDPOINTS.SAVE, payload);
  }
}
