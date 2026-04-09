import { PaginationOptions } from '../../utils/pagination/types';

/**
 * Tenant policy assignment
 */
export interface TenantPolicy {
  tenantIdentifier: string;
  policyIdentifier: string;
  productIdentifier: string;
  licenseTypeIdentifier: string;
  tenantName: string;
}

/**
 * User policy assignment
 */
export interface UserPolicy {
  userId: string;
  userName: string;
  policyIdentifier: string;
  productIdentifier: string;
}

/**
 * Group policy assignment
 */
export interface GroupPolicy {
  groupId: string;
  groupName: string;
  policyIdentifier: string;
  productIdentifier: string;
}

/**
 * Product associated with a policy
 */
export interface Product {
  name: string;
  label?: string;
  isRestricted?: boolean;
  isCloud?: boolean;
  isRemote?: boolean;
}

/**
 * Policy entity
 */
export interface Policy {
  /** Policy name */
  name: string;
  /** Unique policy identifier */
  identifier: string;
  /** Product associated with the policy */
  product: Product;
  /** Policy description */
  description: string | null;
  /** Policy priority (lower = higher priority) */
  priority: number;
  /** Policy availability (0-100) */
  availability: number;
  /** Tenant policy assignments */
  tenantPolicies: TenantPolicy[];
  /** User policy assignments */
  userPolicies: UserPolicy[];
  /** Group policy assignments */
  groupPolicies: GroupPolicy[];
}

/**
 * Policy form data structure
 */
export interface PolicyFormData {
  data: {
    data: Record<string, unknown>;
  };
}

/**
 * Options for getting all policies
 */
export type PolicyGetAllOptions = PaginationOptions;

/**
 * Options for creating a new policy
 */
export interface PolicyCreateOptions {
  /** Policy name */
  name: string;
  /** Product name for the policy */
  productName: string;
  /** Policy configuration data */
  data: Record<string, unknown>;
  /** Optional policy description */
  description?: string | null;
  /** Policy availability (0-100, default: 99) */
  availability?: number;
}

/**
 * Options for updating an existing policy
 */
export interface PolicyUpdateOptions {
  /** Policy identifier to update */
  policyId: string;
  /** Updated policy configuration data */
  data: Record<string, unknown>;
  /** Policy metadata to update */
  policy: Pick<Policy, 'product' | 'name' | 'description' | 'priority' | 'availability'>;
}
