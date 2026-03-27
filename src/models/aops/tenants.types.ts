import { PaginationOptions } from '../../utils/pagination/types';

/**
 * Tenant policy assignment in a tenant
 */
export interface TenantPolicyAssignment {
  /** Tenant identifier */
  tenantIdentifier: string;
  /** Policy identifier (null if no policy assigned) */
  policyIdentifier: string | null;
  /** Product identifier */
  productIdentifier: string;
  /** License type identifier */
  licenseTypeIdentifier: string;
  /** Tenant name (optional, returned in GET response) */
  tenantName?: string;
}

/**
 * Tenant entity returned from the API
 */
export interface Tenant {
  /** Tenant name */
  name: string;
  /** Tenant unique identifier */
  identifier: string;
  /** Tenant URL */
  url: string;
  /** Tenant status */
  status: string;
  /** Tenant policy assignments */
  tenantPolicies: TenantPolicyAssignment[];
}

/**
 * Options for getting all tenants
 */
export type TenantGetAllOptions = PaginationOptions & {
  /** Search term to filter tenants */
  searchTerm?: string;
};

/**
 * Options for updating tenant policies
 */
export interface TenantPolicyUpdateOptions {
  /** Array of tenant policy assignments to update */
  policies: TenantPolicyAssignment[];
}
