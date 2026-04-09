import { BaseService } from '../base';
import {
  Policy,
  PolicyGetAllOptions,
  PolicyCreateOptions,
  PolicyUpdateOptions,
} from '../../models/aops/policies.types';
import {
  PolicyServiceModel,
  PolicyGetResponse,
  PolicyPagedResponse,
  PolicyDetailsResponse,
  PolicyCreateResponse,
  ProductGetResponse,
  FormTemplateResponse,
} from '../../models/aops/policies.models';
import {
  POLICY_PAGINATION,
  POLICY_PAGINATION_PARAMS,
} from '../../models/aops/policies.constants';
import { POLICY_ENDPOINTS, PRODUCT_ENDPOINTS, CONTENT_ENDPOINTS } from '../../utils/constants/endpoints/aops';
import { PaginatedResponse, NonPaginatedResponse, HasPaginationOptions } from '../../utils/pagination/types';
import { PaginationType } from '../../utils/pagination/internal-types';
import { PaginationHelpers } from '../../utils/pagination/helpers';
import { track } from '../../core/telemetry';

/**
 * Service for interacting with UiPath Policy API
 *
 * Provides methods for managing policies, products, and form templates
 * in the UiPath Autonomous Operations (AoPS) platform.
 *
 * @example
 * ```typescript
 * import { UiPath } from '@uipath/uipath-typescript/core';
 * import { Policies } from '@uipath/uipath-typescript/policies';
 *
 * const sdk = new UiPath(config);
 * await sdk.initialize();
 *
 * const policies = new Policies(sdk);
 *
 * // Get all policies
 * const allPolicies = await policies.getAll();
 *
 * // Get a specific policy with its form data
 * const details = await policies.getDetails('policy-id');
 * ```
 */
export class PolicyService extends BaseService implements PolicyServiceModel {
  /**
   * Gets all policies with optional pagination
   *
   * @param options - Pagination options (pageSize, cursor, jumpToPage)
   * @returns Promise resolving to array of policies or paginated response
   *
   * @example
   * ```typescript
   * import { Policies } from '@uipath/uipath-typescript/policies';
   *
   * const policies = new Policies(sdk);
   *
   * // Get all policies (non-paginated)
   * const allPolicies = await policies.getAll();
   *
   * // Get first page with pagination
   * const page1 = await policies.getAll({ pageSize: 10 });
   *
   * // Navigate to next page
   * if (page1.hasNextPage) {
   *   const page2 = await policies.getAll({ cursor: page1.nextCursor });
   * }
   *
   * // Jump to specific page
   * const page5 = await policies.getAll({ jumpToPage: 5, pageSize: 10 });
   * ```
   */
  @track('Policies.GetAll')
  async getAll<T extends PolicyGetAllOptions = PolicyGetAllOptions>(
    options?: T
  ): Promise<
    T extends HasPaginationOptions<T>
      ? PaginatedResponse<Policy>
      : NonPaginatedResponse<Policy>
  > {
    return PaginationHelpers.getAll({
      serviceAccess: this.createPaginationServiceAccess(),
      getEndpoint: () => POLICY_ENDPOINTS.GET_ALL,
      pagination: {
        paginationType: PaginationType.OFFSET,
        itemsField: POLICY_PAGINATION.ITEMS_FIELD,
        totalCountField: POLICY_PAGINATION.TOTAL_COUNT_FIELD,
        paginationParams: {
          pageSizeParam: POLICY_PAGINATION_PARAMS.PAGE_SIZE_PARAM,
          offsetParam: POLICY_PAGINATION_PARAMS.PAGE_INDEX_PARAM,
        },
      },
    }, options) as any;
  }

  /**
   * Gets a policy by its identifier
   *
   * @param policyId - The unique identifier of the policy
   * @returns Promise resolving to the policy
   *
   * @example
   * ```typescript
   * const policy = await policies.getById('my-policy-id');
   * console.log(policy.name, policy.product.name);
   * ```
   */
  @track('Policies.GetById')
  async getById(policyId: string): Promise<PolicyGetResponse> {
    const response = await this.get<PolicyGetResponse>(
      POLICY_ENDPOINTS.GET_BY_ID(policyId)
    );
    return response.data;
  }

  /**
   * Gets the form/configuration data for a policy
   *
   * @param policyId - The unique identifier of the policy
   * @returns Promise resolving to the policy form data
   *
   * @example
   * ```typescript
   * const formData = await policies.getFormData('my-policy-id');
   * console.log(formData);
   * ```
   */
  @track('Policies.GetFormData')
  async getFormData(policyId: string): Promise<Record<string, unknown>> {
    const response = await this.get<Record<string, unknown>>(
      POLICY_ENDPOINTS.GET_FORM_DATA(policyId)
    );
    return response.data;
  }

  /**
   * Gets both policy metadata and form data in a single call
   *
   * @param policyId - The unique identifier of the policy
   * @returns Promise resolving to policy details including metadata and form data
   *
   * @example
   * ```typescript
   * const details = await policies.getDetails('my-policy-id');
   * console.log(details.policy.name);
   * console.log(details.formData);
   * ```
   */
  @track('Policies.GetDetails')
  async getDetails(policyId: string): Promise<PolicyDetailsResponse> {
    const [policy, formData] = await Promise.all([
      this.getById(policyId),
      this.getFormData(policyId),
    ]);
    return { policy, formData };
  }

  /**
   * Gets all available products
   *
   * Products define the types of policies that can be created.
   *
   * @returns Promise resolving to array of products
   *
   * @example
   * ```typescript
   * const products = await policies.getProducts();
   * console.log(products.map(p => p.name));
   * ```
   */
  @track('Policies.GetProducts')
  async getProducts(): Promise<ProductGetResponse> {
    const response = await this.get<ProductGetResponse>(
      PRODUCT_ENDPOINTS.GET_ALL
    );
    return response.data;
  }

  /**
   * Gets the default form template for a product type
   *
   * Use this to get the initial configuration structure when creating a new policy.
   *
   * @param productName - The name of the product (e.g., 'AITrustLayer')
   * @returns Promise resolving to the form template
   *
   * @example
   * ```typescript
   * const template = await policies.getFormTemplate('AITrustLayer');
   * // Use template as initial data for creating a new policy
   * ```
   */
  @track('Policies.GetFormTemplate')
  async getFormTemplate(productName: string): Promise<FormTemplateResponse> {
    const response = await this.get<FormTemplateResponse>(
      CONTENT_ENDPOINTS.GET_FORM_TEMPLATE(productName)
    );
    return response.data;
  }

  /**
   * Creates a new policy
   *
   * @param options - Policy creation options
   * @returns Promise resolving to the created policy
   *
   * @example
   * ```typescript
   * // First get the form template
   * const template = await policies.getFormTemplate('AITrustLayer');
   *
   * // Create a new policy
   * const newPolicy = await policies.create({
   *   name: 'My New Policy',
   *   productName: 'AITrustLayer',
   *   data: template,
   *   description: 'Policy description',
   *   availability: 99
   * });
   * ```
   */
  @track('Policies.Create')
  async create(options: PolicyCreateOptions): Promise<PolicyCreateResponse> {
    const requestBody = {
      policy: {
        product: { name: options.productName },
        name: options.name,
        description: options.description ?? null,
        priority: 0,
        availability: options.availability ?? 99,
      },
      policyFormData: {
        data: {
          data: options.data,
        },
      },
    };

    const response = await this.post<PolicyCreateResponse>(
      POLICY_ENDPOINTS.SAVE,
      requestBody
    );
    return response.data;
  }

  /**
   * Updates an existing policy
   *
   * @param options - Policy update options including policyId, data, and policy metadata
   * @returns Promise resolving when the update is complete
   *
   * @example
   * ```typescript
   * // Get current policy details
   * const details = await policies.getDetails('my-policy-id');
   *
   * // Modify the form data
   * const updatedData = { ...details.formData, someSetting: 'newValue' };
   *
   * // Update the policy
   * await policies.update({
   *   policyId: 'my-policy-id',
   *   data: updatedData,
   *   policy: {
   *     product: details.policy.product,
   *     name: details.policy.name,
   *     description: details.policy.description,
   *     priority: details.policy.priority,
   *     availability: details.policy.availability
   *   }
   * });
   * ```
   */
  @track('Policies.Update')
  async update(options: PolicyUpdateOptions): Promise<void> {
    const requestBody = {
      policy: {
        product: options.policy.product,
        identifier: options.policyId,
        name: options.policy.name,
        description: options.policy.description,
        priority: options.policy.priority,
        availability: options.policy.availability,
      },
      policyFormData: {
        data: {
          data: options.data,
        },
      },
    };

    await this.put<void>(POLICY_ENDPOINTS.SAVE, requestBody);
  }

  /**
   * Deletes a policy by its identifier
   *
   * @param policyId - The unique identifier of the policy to delete
   * @returns Promise resolving when the deletion is complete
   *
   * @example
   * ```typescript
   * await policies.deleteById('my-policy-id');
   * ```
   */
  @track('Policies.Delete')
  async deleteById(policyId: string): Promise<void> {
    await super.delete<void>(POLICY_ENDPOINTS.DELETE(policyId));
  }
}
