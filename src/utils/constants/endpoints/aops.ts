/**
 * AoPS (Autonomous Operations) Service Endpoints
 */

import { AOPS_BASE } from './base';

/**
 * Policy Service Endpoints
 */
export const POLICY_ENDPOINTS = {
  /** Get all policies with pagination */
  GET_ALL: `${AOPS_BASE}/api/Policy/federated/paged`,

  /** Get a single policy by ID */
  GET_BY_ID: (policyId: string) => `${AOPS_BASE}/api/Policy/id/${policyId}`,

  /** Get policy form data by ID */
  GET_FORM_DATA: (policyId: string) => `${AOPS_BASE}/api/Policy/form-data/${policyId}`,

  /** Create or update a policy */
  SAVE: `${AOPS_BASE}/api/Policy`,

  /** Delete a policy by ID */
  DELETE: (policyId: string) => `${AOPS_BASE}/api/Policy/${policyId}`,
} as const;

/**
 * Tenant Service Endpoints
 */
export const TENANT_ENDPOINTS = {
  /** Get tenants for the organization (PUT request with pagination) */
  GET_ALL: `${AOPS_BASE}/api/Tenant/`,

  /** Get a specific tenant by ID */
  GET_BY_ID: (tenantId: string) => `${AOPS_BASE}/api/Tenant/${tenantId}`,

  /** Save/update tenant policies */
  SAVE: `${AOPS_BASE}/api/Tenant`,
} as const;

/**
 * Product Service Endpoints
 */
export const PRODUCT_ENDPOINTS = {
  /** Get all products */
  GET_ALL: `${AOPS_BASE}/api/Product`,
} as const;

/**
 * Content Service Endpoints
 */
export const CONTENT_ENDPOINTS = {
  /** Get form template for a product */
  GET_FORM_TEMPLATE: (productName: string) => `${AOPS_BASE}/api/Content/form-templates/${productName}`,
} as const;

/**
 * License Type Service Endpoints
 */
export const LICENSE_TYPE_ENDPOINTS = {
  /** Get all license types */
  GET_ALL: `${AOPS_BASE}/api/LicenseType`,
} as const;
