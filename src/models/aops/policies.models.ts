import { Policy, Product } from './policies.types';

/**
 * Response from getting a single policy
 */
export type PolicyGetResponse = Policy;

/**
 * Response from getting all policies (paginated)
 */
export interface PolicyPagedResponse {
  /** Total number of policies */
  totalCount: number;
  /** Array of policies in the current page */
  result: Policy[];
}

/**
 * Response from getting policy details (policy + form data)
 */
export interface PolicyDetailsResponse {
  /** The policy metadata */
  policy: Policy;
  /** The policy form/configuration data */
  formData: Record<string, unknown>;
}

/**
 * Response from creating a policy
 */
export type PolicyCreateResponse = Policy;

/**
 * Response from getting products
 */
export type ProductGetResponse = Product[];

/**
 * Response from getting a form template
 */
export type FormTemplateResponse = Record<string, unknown>;

/**
 * Service model interface for PolicyService
 */
export interface PolicyServiceModel {
  getAll(options?: import('./policies.types').PolicyGetAllOptions): Promise<
    import('../../utils/pagination/types').PaginatedResponse<Policy> |
    import('../../utils/pagination/types').NonPaginatedResponse<Policy>
  >;
  getById(policyId: string): Promise<PolicyGetResponse>;
  getFormData(policyId: string): Promise<Record<string, unknown>>;
  getDetails(policyId: string): Promise<PolicyDetailsResponse>;
  getProducts(): Promise<ProductGetResponse>;
  getFormTemplate(productName: string): Promise<FormTemplateResponse>;
  create(options: import('./policies.types').PolicyCreateOptions): Promise<PolicyCreateResponse>;
  update(options: import('./policies.types').PolicyUpdateOptions): Promise<void>;
  deleteById(policyId: string): Promise<void>;
}
